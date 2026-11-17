<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** W10 History: more rows, changes, deletes, several at once, receipts and the CSV. */
class HistoryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
    }

    private function fake(array $extra = []): void
    {
        Http::fake([
            'api.test/api/dashboard/budgets' => Http::response(self::budgets()),
            ...$extra,
        ]);
    }

    public function test_more_rows_use_the_kept_filters_and_never_page_one(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/history*' => Http::response(['list' => ['data' => [], 'current_page' => 2, 'last_page' => 2, 'total' => 60]])]);

        $this->signedIn()->withSession(['history_filters' => ['q' => 'shop', 'order' => 'oldest']])
            ->getJson('/history/rows?tab=spent&page=1')->assertOk()->assertJsonPath('page', 2)->assertJsonPath('total', 60);

        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/history') && $r['page'] == 2 && $r['q'] === 'shop' && $r['order'] === 'oldest');
    }

    public function test_a_row_is_changed_on_its_own_path(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/deposits/40' => Http::response(['id' => 40, 'note' => 'November salary']),
            'api.test/api/dashboard/budgets/3/transfers/31' => Http::response(['id' => 31, 'amount' => '250.00']),
            'api.test/api/dashboard/budgets/3/expenses/5' => Http::response(['id' => 5, 'envelope_id' => 2]),
        ]);

        $this->signedIn()->patchJson('/history/income/40', ['note' => 'November salary'])->assertOk()->assertJsonPath('note', 'November salary');
        $this->signedIn()->patchJson('/history/moved/31', ['amount' => '250.00', 'to_envelope_id' => 2])->assertOk();
        $this->signedIn()->patchJson('/history/spent/5', ['envelope_id' => 2, 'refund' => true])->assertOk();

        Http::assertSent(fn (Request $r) => $r->method() === 'PATCH' && str_ends_with($r->url(), '/transfers/31') && $r['to_envelope_id'] === 2);
        // Only the fields a row of that kind takes go on.
        Http::assertSent(fn (Request $r) => $r->method() === 'PATCH' && str_ends_with($r->url(), '/expenses/5') && ! array_key_exists('refund', $r->data()));
    }

    public function test_deletes_and_envelope_changes_go_as_one_call(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/history/bulk' => Http::response(['done' => 2])]);

        $this->signedIn()->postJson('/history/income/delete', ['ids' => [40, '39']])->assertNoContent();
        $this->signedIn()->postJson('/history/spent/envelope', ['ids' => [1, 2], 'envelope_id' => 8])->assertNoContent();

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/history/bulk') && $r['tab'] === 'income' && $r['action'] === 'delete' && $r['ids'] === [40, 39]);
        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/history/bulk') && $r['action'] === 'envelope' && $r['envelope_id'] === 8);
    }

    public function test_a_refused_row_and_a_forbidden_one_come_back_as_messages(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/history/bulk' => Http::response(['message' => 'x', 'errors' => ['ids.0' => ['This income has already been allocated to envelopes, so it can’t be deleted. Edit its amount instead.']]], 422),
            'api.test/api/dashboard/budgets/3/expenses/1/receipt' => Http::response(['message' => 'Receipt photos need Premium.', 'code' => 'premium_required', 'feature' => 'receipts'], 403),
        ]);

        $this->signedIn()->postJson('/history/income/delete', ['ids' => [40]])->assertStatus(422)->assertJsonPath('errors', ['ids.0' => ['This income has already been allocated to envelopes, so it can’t be deleted. Edit its amount instead.']]);
        $this->signedIn()->post('/history/receipt/1', ['receipt' => UploadedFile::fake()->image('slip.jpg')], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('errors.form.0', 'Receipt photos need Premium.');
    }

    public function test_a_new_expense_takes_its_receipt_along(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/expenses' => Http::response(['id' => 77], 201),
            'api.test/api/dashboard/budgets/3/expenses/77/receipt' => Http::response(['has_receipt' => true], 201),
        ]);

        $this->signedIn()->from('/history')->post('/money/expenses', ['envelope_id' => 1, 'amount' => '12.00', 'date' => '2026-11-09', 'receipt' => UploadedFile::fake()->image('slip.jpg')])
            ->assertRedirect('/history')->assertSessionHas('saved', 'expense')->assertSessionMissing('status');

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/expenses') && ! array_key_exists('receipt', $r->data()));
        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/expenses/77/receipt') && $r->isMultipart());
    }

    public function test_the_csv_names_things_and_keeps_formulas_as_text(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/history/export*' => Http::response([
            'rows' => [
                ['id' => 1, 'envelope_id' => 1, 'amount' => '842.30', 'refund' => false, 'date' => '2026-11-09', 'note' => '=HYPERLINK("x")', 'created_by' => 7],
                ['id' => 2, 'envelope_id' => 1, 'amount' => '349.00', 'refund' => true, 'date' => '2026-11-08', 'note' => '-2+3', 'created_by' => 7],
            ],
            'envelopes' => [['id' => 1, 'name' => 'Groceries']], 'accounts' => [], 'members' => [['id' => 7, 'name' => 'Hudson']],
        ])]);

        $csv = $this->signedIn()->get('/history/export?tab=spent')->assertOk()->assertDownload()->streamedContent();

        $this->assertStringContainsString('Date,Note,Envelope,Refund,Amount', $csv);
        $this->assertStringContainsString('"\'=HYPERLINK(""x"")",Groceries,No,842.30,Hudson', $csv);
        $this->assertStringContainsString("'-2+3,Groceries,Yes,-349.00,Hudson", $csv);
    }
}
