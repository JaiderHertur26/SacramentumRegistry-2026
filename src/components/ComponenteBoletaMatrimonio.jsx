
import React, { forwardRef } from 'react';
import { Church, Heart } from 'lucide-react';

const ComponenteBoletaMatrimonio = forwardRef(({ data, parishData }, ref) => {
    if (!data) return null;

    const Field = ({ label, value, fullWidth = false }) => (
        <div className={`flex flex-col ${fullWidth ? 'col-span-full' : ''}`}>
            <span className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">{label}</span>
            <span className={`text-sm font-serif border-b border-gray-300 min-h-[1.25rem] ${value ? 'text-gray-900 font-medium' : 'text-transparent'}`}>
                {value || '______________________'}
            </span>
        </div>
    );

    const safeId = data.id ? String(data.id) : '';
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
                        {type === 'archive' ? 'Copia Parroquia' : 'Copia Contrayentes'}
                    </div>
                    <h2 className="text-lg font-bold uppercase text-gray-900 border-b-2 border-gray-900 pb-1">
                        Boleta de Matrimonio
                    </h2>
                    <p className="text-xs font-mono mt-1 text-gray-500">
                        No. {displayId.toUpperCase() || '---'}
                    </p>
                </div>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-4 gap-x-4 gap-y-3 flex-1 content-start">
                <Field label="Fecha de Inscripción" value={new Date().toLocaleDateString()} />
                <Field label="Fecha Matrimonio" value={data.sacramentDate} />
                <Field label="Lugar de Celebración" value={data.place || parishData?.name} fullWidth={false} />
                <Field label="Ministro" value={data.minister} />

                <div className="col-span-4 h-2 flex items-center justify-center border-b border-gray-100 mb-2">
                    <Heart className="w-4 h-4 text-gray-300" />
                </div>

                {/* Groom */}
                <div className="col-span-2 space-y-2 pr-2 border-r border-gray-100">
                     <h4 className="text-xs font-bold uppercase text-blue-800">El Novio</h4>
                     <Field label="Nombres" value={data.groomName} />
                     <Field label="Apellidos" value={data.groomSurname} />
                     <Field label="Documento ID" value={data.groomId} />
                     <Field label="Padre" value={data.groomFather} />
                     <Field label="Madre" value={data.groomMother} />
                </div>

                {/* Bride */}
                <div className="col-span-2 space-y-2 pl-2">
                     <h4 className="text-xs font-bold uppercase text-pink-800">La Novia</h4>
                     <Field label="Nombres" value={data.brideName} />
                     <Field label="Apellidos" value={data.brideSurname} />
                     <Field label="Documento ID" value={data.brideId} />
                     <Field label="Padre" value={data.brideFather} />
                     <Field label="Madre" value={data.brideMother} />
                </div>

                <div className="col-span-4 h-2"></div>

                <div className="col-span-2">
                    <Field label="Testigo 1" value={data.witness1 || data.witnesses?.[0]?.name} />
                </div>
                <div className="col-span-2">
                    <Field label="Testigo 2" value={data.witness2 || data.witnesses?.[1]?.name} />
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

ComponenteBoletaMatrimonio.displayName = 'ComponenteBoletaMatrimonio';
export default ComponenteBoletaMatrimonio;
