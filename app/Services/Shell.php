<?php

namespace App\Services;

use Illuminate\Support\Arr;

/**
 * What every signed-in page needs around it: the signed-in person and their budgets, with the one
 * they're looking at (kept in the session, the first unpaused budget otherwise).
 */
class Shell
{
    private ?array $budgets = null;

    public function __construct(private Api $api) {}

    public function user(): array
    {
        return session('user', []);
    }

    public function isAdmin(): bool
    {
        return session('user.is_admin') === true;
    }

    /** @return list<array> */
    public function budgets(): array
    {
        // Kept in the session for a minute, so most pages skip this call. Switching budget doesn't
        // change the list; anything that changes budgets (a pause, a new one) shows within a minute.
        return $this->budgets ??= $this->cached();
    }

    private function cached(): array
    {
        $cache = session('budgets_cache');

        if (is_array($cache) && ($cache['at'] ?? 0) > time() - 60) {
            return $cache['data'];
        }

        $data = array_values($this->api->json('/dashboard/budgets'));
        session(['budgets_cache' => ['at' => time(), 'data' => $data]]);

        return $data;
    }

    public function budget(): ?array
    {
        $budgets = $this->budgets();
        $chosen = Arr::first($budgets, fn ($b) => $b['id'] === session('budget_id'));

        $budget = $chosen ?? Arr::first($budgets, fn ($b) => ! ($b['paused'] ?? false)) ?? ($budgets[0] ?? null);

        if ($budget && session('budget_id') !== $budget['id']) {
            session(['budget_id' => $budget['id']]);
        }

        return $budget;
    }

    public function budgetId(): int
    {
        return $this->budget()['id'] ?? abort(404);
    }

    public function choose(int $id): bool
    {
        if (! Arr::first($this->budgets(), fn ($b) => $b['id'] === $id)) {
            return false;
        }

        session(['budget_id' => $id]);

        return true;
    }

    /** Two letters for a budget's tile: "Our home" → "OH". */
    public static function initials(string $name): string
    {
        $words = preg_split('/\s+/u', trim(preg_replace('/[^\p{L}\p{N}\s]/u', '', $name))) ?: [];
        $letters = array_map(fn ($w) => mb_substr($w, 0, 1), array_slice(array_filter($words), 0, 2));

        return mb_strtoupper(implode('', $letters)) ?: 'P';
    }
}
