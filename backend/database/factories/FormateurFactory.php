<?php

namespace Database\Factories;

use App\Models\Formateur;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class FormateurFactory extends Factory
{
    protected $model = Formateur::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->formateur(),
            'matricule' => 'F' . fake()->unique()->numerify('####'),
            'specialisation' => fake()->randomElement([
                'Développement Web',
                'Java / POO',
                'Réseaux informatiques',
                'Base de données',
                'Systèmes embarqués',
                'Intelligence Artificielle',
                'Cybersécurité',
                'Cloud Computing',
                'DevOps',
                'Data Science',
                'Administration système',
                'Gestion de projet',
            ]),
            'date_recrutement' => fake()->dateTimeBetween('-10 years', '-1 year'),
            'is_active' => true,
        ];
    }
}
