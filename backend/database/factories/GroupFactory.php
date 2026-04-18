<?php

namespace Database\Factories;

use App\Models\Group;
use App\Models\Filiere;
use Illuminate\Database\Eloquent\Factories\Factory;

class GroupFactory extends Factory
{
    protected $model = Group::class;

    public function definition(): array
    {
        return [
            'nom' => strtoupper(fake()->lexify('???')) . '-' . fake()->numberBetween(101, 301),
            'filiere_id' => Filiere::factory(),
            'annee' => fake()->randomElement([1, 2]),
            'annee_scolaire' => '2025-2026',
            'max_stagiaires' => fake()->randomElement([25, 30, 35]),
            'is_active' => true,
        ];
    }
}
