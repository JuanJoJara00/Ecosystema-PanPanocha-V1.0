import { useState, useEffect } from 'react';
import { Button } from '@panpanocha/ui';
import { X, Save } from 'lucide-react';

interface NoteModalProps {
    currentNote?: string;
    onSave: (note: string) => void;
    onClose: () => void;
}

export function NoteModal({ currentNote = '', onSave, onClose }: NoteModalProps) {
    const [note, setNote] = useState(currentNote);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-display font-bold text-brand-secondary">
                        Agregar Nota / Modificador
                    </h2>
                    <Button variant="ghost" onClick={onClose} className="rounded-full h-10 w-10 p-0 text-brand-secondary/50 hover:bg-brand-secondary/5">
                        <X size={24} />
                    </Button>
                </div>

                <div className="space-y-4">
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ej: Sin cebolla, extra queso, término medio..."
                        className="w-full h-32 p-4 rounded-xl border-2 border-brand-secondary/10 focus:border-brand-primary outline-none resize-none bg-brand-accent/30 text-lg"
                        autoFocus
                    />

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="h-12 rounded-xl border-2 hover:bg-brand-secondary/5"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => onSave(note)}
                            className="h-12 rounded-xl bg-brand-primary text-white hover:bg-brand-primary/90 font-bold"
                        >
                            <Save size={20} className="mr-2" />
                            Guardar Nota
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
