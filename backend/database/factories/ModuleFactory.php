<?php

namespace Database\Factories;

use App\Models\Module;
use App\Models\Filiere;
use Illuminate\Database\Eloquent\Factories\Factory;

class ModuleFactory extends Factory
{
    protected $model = Module::class;

    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->bothify('M###')),
            'nom' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'coefficient' => fake()->randomElement([1, 2, 3, 4]),
            'heures_total' => fake()->randomElement([40, 60, 80, 100, 120]),
            'filiere_id' => Filiere::factory(),
            'semestre' => fake()->randomElement([1, 2]),
            'is_active' => true,
        ];
    }
}
