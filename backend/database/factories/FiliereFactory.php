<?php

namespace Database\Factories;

use App\Models\Filiere;
use Illuminate\Database\Eloquent\Factories\Factory;

class FiliereFactory extends Factory
{
    protected $model = Filiere::class;

    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->lexify('???')),
            'nom' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'duree_mois' => fake()->randomElement([12, 24, 30]),
            'is_active' => true,
        ];
    }
}
