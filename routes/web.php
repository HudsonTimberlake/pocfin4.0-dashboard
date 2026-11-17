<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AccountsController;
use App\Http\Controllers\AllocateController;
use App\Http\Controllers\Admin\LogController as AdminLogController;
use App\Http\Controllers\Admin\SupportController as AdminSupportController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\EnvelopeController;
use App\Http\Controllers\HistoryController;
use App\Http\Controllers\InviteController;
use App\Http\Controllers\MoneyController;
use App\Http\Controllers\OverviewController;
use App\Http\Controllers\PremiumController;
use App\Http\Controllers\RecapController;
use Illuminate\Support\Facades\Route;

// Signing in. The API has its own limits; these are ours, per visitor.
Route::middleware('throttle:20,1')->group(function () {
    Route::get('/sign-in', [AuthController::class, 'showSignIn'])->name('sign-in');
    Route::post('/sign-in', [AuthController::class, 'signIn']);
    Route::get('/code', [AuthController::class, 'showCode'])->name('code');
    Route::post('/code', [AuthController::class, 'checkCode']);
    Route::post('/code/resend', [AuthController::class, 'resendCode'])->name('code.resend');
    Route::get('/forgot-password', [AuthController::class, 'showForgot'])->name('forgot');
    Route::post('/forgot-password', [AuthController::class, 'forgot']);
    Route::get('/reset-password', [AuthController::class, 'showReset'])->name('reset');
    Route::post('/reset-password', [AuthController::class, 'reset']);
    Route::get('/lock', [AuthController::class, 'showLock'])->name('lock');
    Route::post('/lock', [AuthController::class, 'unlock']);
});
Route::post('/sign-out', [AuthController::class, 'signOut'])->name('sign-out');

Route::middleware(['signed.in', 'idle'])->group(function () {
    Route::post('/lock-now', [AuthController::class, 'lockNow'])->name('lock-now');
    Route::post('/budget/switch', [BudgetController::class, 'switch'])->name('budget.switch');

    Route::get('/', [OverviewController::class, 'show'])->name('overview');

    // Version 2: the Add panel and in-place edits (W3). Amounts and notes travel in the body, never the address.
    Route::get('/add/options', [MoneyController::class, 'options'])->name('add.options');
    Route::post('/money/expenses', [MoneyController::class, 'storeExpense'])->name('money.expense');
    Route::patch('/money/expenses/{expense}', [MoneyController::class, 'updateExpense'])->whereNumber('expense');
    Route::delete('/money/expenses/{expense}', [MoneyController::class, 'destroyExpense'])->whereNumber('expense');
    Route::post('/money/income', [MoneyController::class, 'storeIncome'])->name('money.income');
    Route::post('/money/moves', [MoneyController::class, 'storeMove'])->name('money.move');
    Route::post('/money/accounts/{account}/expenses', [MoneyController::class, 'storeAccountExpense'])->whereNumber('account');
    Route::get('/budget', [BudgetController::class, 'show'])->name('budget');
    // Version 2 Budget writes (W6/W7).
    Route::post('/envelopes', [EnvelopeController::class, 'store'])->name('envelopes.store');
    Route::put('/envelopes/order', [EnvelopeController::class, 'reorder'])->name('envelopes.order');
    Route::patch('/envelopes/{envelope}', [EnvelopeController::class, 'update'])->whereNumber('envelope');
    Route::delete('/envelopes/{envelope}', [EnvelopeController::class, 'destroy'])->whereNumber('envelope');
    // Version 2 Allocate (W8): staged in the browser, sent together.
    Route::get('/allocate', [AllocateController::class, 'show'])->name('allocate');
    Route::post('/allocate/{deposit}', [AllocateController::class, 'store'])->whereNumber('deposit');
    Route::patch('/allocate/mode', [AllocateController::class, 'mode']);
    Route::get('/history', [HistoryController::class, 'show'])->name('history');
    // Search words and filters are posted and kept in the session, never put in the address.
    Route::post('/history', [HistoryController::class, 'filter']);
    Route::get('/history/receipt/{expense}', [HistoryController::class, 'receipt'])->whereNumber('expense')->name('history.receipt');
    Route::get('/accounts', [AccountsController::class, 'show'])->name('accounts');
    Route::get('/recaps', [RecapController::class, 'show'])->name('recaps');

    Route::get('/account', [AccountController::class, 'show'])->name('account');
    Route::post('/account/profile', [AccountController::class, 'profile'])->name('account.profile');
    Route::post('/account/password', [AccountController::class, 'password'])->name('account.password');
    Route::post('/account/sessions', [AccountController::class, 'signOutOthers'])->name('account.sessions');
    Route::get('/account/delete', [AccountController::class, 'showDelete'])->name('account.delete');
    Route::post('/account/delete', [AccountController::class, 'destroy']);
    Route::get('/premium', [PremiumController::class, 'show'])->name('premium');
    Route::post('/premium/covered', [PremiumController::class, 'covered'])->name('premium.covered');
    Route::get('/invite', [InviteController::class, 'show'])->name('invite');
    Route::post('/invite/budget', [InviteController::class, 'budget'])->name('invite.budget');
});

Route::middleware(['signed.in', 'idle:admin', 'admin.only'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/users', [AdminUserController::class, 'index'])->name('users');
    Route::post('/users', [AdminUserController::class, 'filter']);
    Route::get('/users/{user}', [AdminUserController::class, 'show'])->whereNumber('user')->name('user');
    Route::post('/users/{user}/premium', [AdminUserController::class, 'premium'])->whereNumber('user')->name('user.premium');
    Route::post('/users/{user}/sync', [AdminUserController::class, 'sync'])->whereNumber('user')->name('user.sync');
    Route::post('/users/{user}/verification', [AdminUserController::class, 'verification'])->whereNumber('user')->name('user.verification');
    Route::get('/support', [AdminSupportController::class, 'index'])->name('support');
    Route::post('/support/{thread}/reply', [AdminSupportController::class, 'reply'])->whereNumber('thread')->name('support.reply');
    Route::post('/support/{thread}/status', [AdminSupportController::class, 'status'])->whereNumber('thread')->name('support.status');
    Route::get('/support/attachments/{attachment}', [AdminSupportController::class, 'attachment'])->whereNumber('attachment')->name('support.attachment');
    Route::get('/log', [AdminLogController::class, 'index'])->name('log');
});
