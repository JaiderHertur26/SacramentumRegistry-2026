
import React, { useState } from 'react';
import { normalizeBaptismPartida, validateBaptismPartidaStructure } from '@/utils/baptismDataNormalizer';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Copy, FileJson } from 'lucide-react';

const BaptismPartidaValidator = ({ rawData }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    if (!rawData) return null;

    const normalized = normalizeBaptismPartida(rawData);
    const { isValid, missingFields } = validateBaptismPartidaStructure(normalized);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(normalized, null, 2));
        alert("JSON copiado al portapapeles");
    };

    if (!isOpen) {
        return (
            <div className="mt-4">
                 <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="text-xs gap-2">
                    <FileJson className="w-3 h-3" /> Debug Datos
                 </Button>
            </div>
        );
    }

    return (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50 text-xs font-mono">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-gray-700">Inspector de Datos (Dev)</h4>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={copyToClipboard}><Copy className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Cerrar</Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <h5 className="font-bold border-b pb-1">Raw Data (Input)</h5>
                    <pre className="overflow-auto max-h-40 bg-white p-2 border rounded">
                        {JSON.stringify(rawData, null, 2)}
                    </pre>
                </div>
                <div className="space-y-2">
                    <h5 className="font-bold border-b pb-1">Normalized (Output)</h5>
                    <pre className="overflow-auto max-h-40 bg-white p-2 border rounded">
                        {JSON.stringify(normalized, null, 2)}
                    </pre>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t">
                {isValid ? (
                    <div className="flex items-center text-green-600 gap-2">
                        <CheckCircle className="w-4 h-4" /> Estructura válida para impresión
                    </div>
                ) : (
                    <div className="flex flex-col text-red-600 gap-1">
                        <div className="flex items-center gap-2 font-bold">
                            <AlertTriangle className="w-4 h-4" /> Datos incompletos
                        </div>
                        <ul className="list-disc list-inside ml-5">
                            {missingFields.map(f => <li key={f}>{f}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BaptismPartidaValidator;
