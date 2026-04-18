<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'nom' => fake('fr_FR')->lastName(),
            'prenom' => fake('fr_FR')->firstName(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => 'stagiaire',
            'telephone' => fake('fr_FR')->phoneNumber(),
            'is_active' => true,
            'remember_token' => Str::random(10),
        ];
    }

    public function directeur(): static
    {
        return $this->state(fn () => ['role' => 'directeur']);
    }

    public function formateur(): static
    {
        return $this->state(fn () => ['role' => 'formateur']);
    }

    public function stagiaire(): static
    {
        return $this->state(fn () => ['role' => 'stagiaire']);
    }

    public function surveillant(): static
    {
        return $this->state(fn () => ['role' => 'surveillant']);
    }
}
