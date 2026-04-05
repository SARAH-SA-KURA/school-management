<?php

namespace Database\Factories;

use App\Models\Salle;
use Illuminate\Database\Eloquent\Factories\Factory;

class SalleFactory extends Factory
{
    protected $model = Salle::class;

    public function definition(): array
    {
        $type = fake()->randomElement(['cours', 'tp', 'amphi', 'reunion']);
        $capacite = match ($type) {
            'amphi' => fake()->randomElement([80, 100, 120, 150]),
            'tp' => fake()->randomElement([15, 20, 25]),
            'reunion' => fake()->randomElement([10, 15, 20]),
            default => fake()->randomElement([25, 30, 35, 40]),
        };

        return [
            'nom' => fake()->unique()->regexify('[A-C][1-9][0-9]{2}'),
            'type' => $type,
            'capacite' => $capacite,
            'batiment' => fake()->randomElement(['A', 'B', 'C', 'D']),
            'equipements' => fake()->randomElements(
                ['Projecteur', 'Ordinateurs', 'Tableau blanc', 'Climatisation', 'Wifi'],
                fake()->numberBetween(1, 3)
            ),
            'is_active' => true,
        ];
    }
}
