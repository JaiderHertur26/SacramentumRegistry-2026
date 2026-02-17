
import React, { forwardRef } from 'react';
import { Church } from 'lucide-react';

const ComponenteBoletaConfirmacion = forwardRef(({ confirmationData, parishData }, ref) => {
    if (!confirmationData) return null;

    // Helper to safely display data or a line for manual entry
    const Field = ({ label, value, fullWidth = false }) => (
        <div className={`flex flex-col ${fullWidth ? 'col-span-full' : ''}`}>
            <span className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">{label}</span>
            <span className={`text-sm font-serif border-b border-gray-300 min-h-[1.25rem] ${value ? 'text-gray-900 font-medium' : 'text-transparent'}`}>
                {value || '______________________'}
            </span>
        </div>
    );

    // Safe ID handling to prevent .slice() errors on numbers
    const safeId = confirmationData.id ? String(confirmationData.id) : '';
    const displayId = safeId.length > 8 ? safeId.slice(0, 8) : safeId;

    const Section = ({ title, type }) => (
        <div className="h-[130mm] flex flex-col p-8 bg-white text-black relative">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 border-2 border-gray-800 rounded-full flex items-center justify-center">
                        <Church className="w-8 h-8 text-gray-800" />
                    </div>
                    <div>
                        <h3 className="text-xs uppercase tracking-widest text-gray-500">{parishData?.dioceseName || 'Diócesis'}</h3>
                        <h1 className="text-xl font-bold uppercase text-gray-900 leading-tight max-w-sm">{parishData?.name || 'Parroquia'}</h1>
                        <p className="text-[10px] text-gray-600 mt-1">{parishData?.city || 'Ciudad'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="inline-block bg-gray-900 text-white px-3 py-1 text-xs font-bold uppercase tracking-widest mb-2">
                        {type === 'archive' ? 'Copia Parroquia' : 'Copia Familia'}
                    </div>
                    <h2 className="text-lg font-bold uppercase text-gray-900 border-b-2 border-gray-900 pb-1">
                        Boleta de Confirmación
                    </h2>
                    <p className="text-xs font-mono mt-1 text-gray-500">
                        No. {displayId.toUpperCase() || '---'}
                    </p>
                </div>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-4 gap-x-4 gap-y-3 flex-1 content-start">
                <Field label="Fecha de Inscripción" value={new Date().toLocaleDateString()} />
                <Field label="Fecha de Confirmación" value={confirmationData.sacramentDate} />
                <Field label="Lugar de Celebración" value={confirmationData.metadata?.place || parishData?.name} fullWidth={false} />
                <Field label="Ministro" value={confirmationData.minister} />

                <div className="col-span-4 h-2"></div>

                <Field label="Nombres del Confirmado(a)" value={confirmationData.firstName} fullWidth={false} />
                <Field label="Apellidos" value={confirmationData.lastName} fullWidth={false} />
                <div className="col-span-2">
                    <Field label="Fecha de Nacimiento" value={confirmationData.birthDate} />
                </div>

                <Field label="Lugar de Nacimiento" value={confirmationData.birthPlace} fullWidth />

                <div className="col-span-4 h-2"></div>

                <Field label="Padre" value={confirmationData.fatherName} fullWidth={false} />
                 <div className="col-span-2">
                     <Field label="Madre" value={confirmationData.motherName} />
                 </div>

                <div className="col-span-4 h-2"></div>

                <div className="col-span-2">
                    <Field label="Padrino/Madrina" value={confirmationData.godparents} />
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-end">
                <div className="text-[10px] text-gray-500 max-w-xs">
                    <p>Parroquia {parishData?.name}</p>
                    <p>{parishData?.address || 'Dirección de la parroquia'}</p>
                    <p>Tel: {parishData?.phone || '---'} | Email: {parishData?.email || '---'}</p>
                </div>
                <div className="text-center w-48">
                    <div className="h-12 border-b border-gray-400 mb-1"></div>
                    <p className="text-[10px] font-bold uppercase">Firma / Sello</p>
                </div>
            </div>
        </div>
    );

    return (
        <div ref={ref} className="bg-white print:block hidden w-[216mm]">
            <Section title="BOLETA PARROQUIAL" type="archive" />
            
            <div className="w-full relative h-[1mm] my-4 flex items-center justify-center">
                <div className="absolute w-full border-t-2 border-dashed border-gray-300"></div>
                <span className="bg-white px-2 text-[10px] text-gray-400 font-mono uppercase tracking-widest relative z-10">Cortar Aquí</span>
            </div>

            <Section title="CONSTANCIA FAMILIA" type="family" />
        </div>
    );
});

ComponenteBoletaConfirmacion.displayName = 'ComponenteBoletaConfirmacion';
export default ComponenteBoletaConfirmacion;
