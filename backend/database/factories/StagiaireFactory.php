<?php

namespace Database\Factories;

use App\Models\Stagiaire;
use App\Models\User;
use App\Models\Group;
use Illuminate\Database\Eloquent\Factories\Factory;

class StagiaireFactory extends Factory
{
    protected $model = Stagiaire::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->stagiaire(),
            'cef' => 'CEF' . fake()->unique()->numerify('######'),
            'cne' => 'CNE' . fake()->unique()->numerify('########'),
            'cin' => fake()->unique()->regexify('[A-Z]{2}[0-9]{6}'),
            'group_id' => Group::factory(),
            'date_inscription' => fake()->dateTimeBetween('2024-09-01', '2025-09-30'),
            'date_naissance' => fake()->dateTimeBetween('2000-01-01', '2006-12-31'),
            'adresse' => fake('fr_FR')->address(),
            'status' => fake()->randomElement(['actif', 'actif', 'actif', 'actif', 'abandon', 'suspendu']),
        ];
    }
}
