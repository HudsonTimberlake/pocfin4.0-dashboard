<?php

namespace App\Support;

/**
 * Shows the API's decimal strings ("8420.50", "-180.40") as rand, without ever turning them into
 * floats: the digits are only regrouped.
 */
class Money
{
    /** @return array{sign: string, whole: string, cents: string, negative: bool} */
    public static function parts(?string $amount): array
    {
        $amount = trim((string) $amount);
        $negative = str_starts_with($amount, '-');
        $digits = ltrim($amount, '-+');
        [$whole, $cents] = array_pad(explode('.', $digits, 2), 2, '00');
        $whole = ltrim($whole, '0') ?: '0';
        $cents = str_pad(substr($cents, 0, 2), 2, '0');
        $negative = $negative && ($whole !== '0' || $cents !== '00');

        return [
            'sign' => $negative ? '−' : '',
            'whole' => 'R'.strrev(implode(',', str_split(strrev($whole), 3))),
            'cents' => '.'.$cents,
            'negative' => $negative,
        ];
    }

    /** "R8,420.50", "−R180.40"; with $plus, "+R349.00" for a positive amount. */
    public static function format(?string $amount, bool $plus = false): string
    {
        $p = self::parts($amount);
        $sign = $p['negative'] ? '−' : ($plus && ! self::isZero($amount) ? '+' : '');

        return $sign.$p['whole'].$p['cents'];
    }

    public static function isNegative(?string $amount): bool
    {
        return self::parts($amount)['negative'];
    }

    public static function isZero(?string $amount): bool
    {
        $p = self::parts($amount);

        return $p['whole'] === 'R0' && $p['cents'] === '.00';
    }

    /** How full a bar is, 0 to 100, from two amounts, worked out in cents. */
    public static function percent(?string $part, ?string $of): int
    {
        $of = self::cents($of);

        return $of <= 0 ? 0 : max(0, min(100, intdiv(self::cents($part) * 100, $of)));
    }

    public static function cents(?string $amount): int
    {
        $p = self::parts($amount);
        $cents = (int) str_replace(['R', ','], '', $p['whole']) * 100 + (int) substr($p['cents'], 1);

        return $p['negative'] ? -$cents : $cents;
    }
}
