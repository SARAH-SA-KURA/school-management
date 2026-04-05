<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Note::with(['stagiaire.user', 'stagiaire.group', 'examen.module']);

        if ($request->has('examen_id')) {
            $query->where('examen_id', $request->examen_id);
        }
        if ($request->has('stagiaire_id')) {
            $query->where('stagiaire_id', $request->stagiaire_id);
        }
        if ($request->has('formateur_id')) {
            $query->whereHas('examen', function ($q) {
                $q->where('formateur_id', request('formateur_id'));
            });
        }

        return $this->paginated($query, $request);
    }

    public function batchStore(Request $request)
    {
        $validated = $request->validate([
            'notes' => 'required|array',
            'notes.*.stagiaire_id' => 'required|exists:stagiaires,id',
            'notes.*.examen_id' => 'required|exists:examens,id',
            'notes.*.note' => 'required|numeric|min:0|max:20',
            'notes.*.remarque' => 'nullable|string',
        ]);

        $created = [];
        foreach ($validated['notes'] as $noteData) {
            $created[] = Note::updateOrCreate(
                [
                    'stagiaire_id' => $noteData['stagiaire_id'],
                    'examen_id' => $noteData['examen_id'],
                ],
                [
                    'note' => $noteData['note'],
                    'remarque' => $noteData['remarque'] ?? null,
                ]
            );
        }

        return $this->success($created, 'Notes enregistrées avec succès');
    }

    public function update(Request $request, Note $note)
    {
        $validated = $request->validate([
            'note' => 'required|numeric|min:0|max:20',
            'remarque' => 'nullable|string',
        ]);

        $note->update($validated);

        return $this->success($note, 'Note mise à jour');
    }
}
