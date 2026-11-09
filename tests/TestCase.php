<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Nothing ever reaches a real API from the tests.
        Http::preventStrayRequests();
        $this->withoutVite();
    }

    /** A signed-in visitor, as the sign-in leaves the session. */
    protected function signedIn(array $user = [], array $session = []): static
    {
        return $this->withSession([
            'api_token' => Crypt::encryptString('1|secret-token'),
            'user' => [
                'id' => 7, 'name' => 'Thandi Mokoena', 'email' => 'thandi@example.com',
                'verified' => true, 'is_admin' => false, ...$user,
            ],
            'timezone' => 'Africa/Johannesburg',
            'last_activity' => time(),
            ...$session,
        ]);
    }

    protected static function budgets(): array
    {
        return [[
            'id' => 3, 'name' => 'Our home', 'currency' => 'ZAR', 'cycle_start_day' => 1, 'role' => 'owner',
            'premium' => ['active' => true, 'status' => 'premium', 'until' => null, 'forever' => true, 'grace_until' => null, 'locked' => [], 'subscription' => null],
            'paused' => false,
        ]];
    }

    protected static function members(): array
    {
        return [
            ['id' => 7, 'name' => 'Thandi Mokoena', 'email' => 'thandi@example.com', 'role' => 'owner'],
            ['id' => 8, 'name' => 'Sipho Mokoena', 'email' => 'sipho@example.com', 'role' => 'member'],
        ];
    }
}
