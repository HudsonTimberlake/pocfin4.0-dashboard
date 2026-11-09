<?php

use App\Support\Money;
use Illuminate\Support\Carbon;
use Illuminate\Support\HtmlString;

if (! function_exists('money')) {
    /** "R8,420.50"; with $plus, "+R349.00". */
    function money(?string $amount, bool $plus = false): string
    {
        return Money::format($amount, $plus);
    }
}

if (! function_exists('money_big')) {
    /** A hero amount: the cents half size and raised. */
    function money_big(?string $amount): HtmlString
    {
        $p = Money::parts($amount);

        return new HtmlString(e($p['sign'].$p['whole']).'<span class="cents">'.e($p['cents']).'</span>');
    }
}

if (! function_exists('day')) {
    /** "9 Nov", or "9 Nov 2025" outside this year; "Today" and "Yesterday" in the visitor's time zone. */
    function day(?string $date, bool $relative = true): string
    {
        if (! $date) {
            return '';
        }

        $tz = session('timezone', 'Africa/Johannesburg');
        $d = Carbon::parse($date)->setTimezone($tz);
        $today = Carbon::now($tz);

        return match (true) {
            $relative && $d->isSameDay($today) => 'Today',
            $relative && $d->isSameDay($today->copy()->subDay()) => 'Yesterday',
            $d->year === $today->year => $d->format('j M'),
            default => $d->format('j M Y'),
        };
    }
}

if (! function_exists('initials')) {
    function initials(?string $name): string
    {
        return mb_strtoupper(mb_substr(trim((string) $name), 0, 1)) ?: '?';
    }
}
