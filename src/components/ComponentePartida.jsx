
import React, { forwardRef } from 'react';

const ComponentePartida = forwardRef(({ 
    baptismData, 
    parishData, 
    firma, 
    cargo, 
    copias = 1,
    incluirNotaNacimiento = false 
}, ref) => {
    if (!baptismData) return null;

    // Helper to format dates
    const formatDate = (dateString) => {
        if (!dateString) return '________________';
        return new Date(dateString).toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    // Helper to safely get godparents string
    const getGodparentsNames = () => {
        const gp = baptismData.godparents;
        if (Array.isArray(gp)) {
            return gp.map(g => g.name || '').filter(Boolean).join(' y ');
        }
        // Fallback if it's just a string (legacy data support)
        if (typeof gp === 'string' && gp.trim() !== '') return gp;
        
        return null;
    };

    const SinglePage = ({ isCopy }) => (
        <div className={`bg-white p-12 max-w-[216mm] h-[279mm] mx-auto font-serif text-black relative page-break-after-always`}>
            
            {/* Header */}
            <div className="text-center border-b-2 border-double border-gray-800 pb-6 mb-8">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-600 mb-2">
                    {parishData?.dioceseName || 'Diócesis'}
                </h3>
                <h1 className="text-2xl font-black uppercase text-gray-900 mb-1">
                    {parishData?.name || 'Parroquia'}
                </h1>
                <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">
                    {parishData?.city || 'Ciudad'}
                </p>
            </div>

            {/* Title & Numbers */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-bold uppercase text-gray-900 underline decoration-2 underline-offset-4">
                        Partida de Bautismo
                    </h2>
                </div>
                <div className="text-right text-sm font-mono border border-gray-300 p-2 rounded bg-gray-50">
                    <div className="flex gap-4">
                        <div><span className="text-gray-500 text-[10px] uppercase block">Libro</span> <span className="font-bold">{baptismData.book_number || '---'}</span></div>
                        <div><span className="text-gray-500 text-[10px] uppercase block">Folio</span> <span className="font-bold">{baptismData.page_number || '---'}</span></div>
                        <div><span className="text-gray-500 text-[10px] uppercase block">Número</span> <span className="font-bold">{baptismData.entry_number || '---'}</span></div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="text-justify leading-loose text-[11pt]">
                <p className="mb-4">
                    En la Parroquia de <span className="font-bold">{parishData?.name}</span> de {parishData?.city}, 
                    el día <span className="font-bold">{formatDate(baptismData.sacramentDate)}</span>;
                </p>

                <p className="mb-4">
                    El Ministro <span className="font-bold uppercase">{baptismData.minister}</span>, bautizó solemnemente a:
                </p>

                <div className="py-2 text-center bg-gray-50 my-4 border-y border-gray-100">
                    <span className="text-2xl font-black uppercase tracking-wide text-gray-800">
                        {baptismData.firstName} {baptismData.lastName}
                    </span>
                </div>

                <p className="mb-4">
                    Nacido(a) en <span className="font-bold">{baptismData.birthPlace || '_______'}</span>, 
                    el día <span className="font-bold">{formatDate(baptismData.birthDate)}</span>.
                </p>

                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 mb-6">
                    <span className="font-bold text-gray-700">Hijo(a) de:</span>
                    <span className="border-b border-gray-300 border-dotted">
                        {baptismData.parents?.map(p => p.name).join(' y ') || baptismData.fatherName + ' y ' + baptismData.motherName}
                    </span>

                    <span className="font-bold text-gray-700">Abuelos Paternos:</span>
                    <span className="border-b border-gray-300 border-dotted text-gray-400 italic">
                        {/* Placeholder for future data */}
                        (No registrados)
                    </span>

                    <span className="font-bold text-gray-700">Abuelos Maternos:</span>
                    <span className="border-b border-gray-300 border-dotted text-gray-400 italic">
                         {/* Placeholder for future data */}
                         (No registrados)
                    </span>

                    <span className="font-bold text-gray-700">Padrinos:</span>
                    <span className="border-b border-gray-300 border-dotted">
                        {getGodparentsNames() || '___________________'}
                    </span>
                </div>

                {/* Optional Birth Note */}
                {incluirNotaNacimiento && (
                    <div className="text-xs bg-gray-50 p-3 border border-gray-200 rounded mb-4">
                        <p className="font-bold uppercase text-gray-500 mb-1">Nota Marginal de Nacimiento Civil</p>
                        <p>Inscrito en el Registro Civil de: _________________________. Serial: ______________. Fecha: ______________.</p>
                    </div>
                )}
                
                 {/* Standard Margin Notes */}
                 <div className="text-xs border-l-2 border-gray-300 pl-3 mb-4 italic text-gray-600">
                    <span className="font-bold not-italic text-gray-800">Notas Marginales:</span> {baptismData.observations || baptismData.metadata?.observations || 'Ninguna.'}
                </div>
            </div>

            {/* Footer / Signature */}
            <div className="absolute bottom-16 left-12 right-12">
                <div className="text-center">
                    <p className="mb-8">
                        Doy fe,
                    </p>
                    <div className="flex justify-center mb-2">
                        <div className="w-64 border-b border-black"></div>
                    </div>
                    <p className="font-bold uppercase text-sm">{firma || 'Pbro. ___________________'}</p>
                    <p className="text-xs uppercase tracking-wider text-gray-600">{cargo || 'Párroco'}</p>
                </div>
                
                <div className="mt-8 flex justify-between items-end text-[9px] text-gray-400 uppercase tracking-widest border-t border-gray-100 pt-2">
                    <span>Eclesia Digital - Sistema de Gestión Parroquial</span>
                    <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
                </div>
            </div>
        </div>
    );

    // Create array of copies
    const pages = Array.from({ length: copias }, (_, i) => <SinglePage key={i} isCopy={i > 0} />);

    return (
        <div ref={ref} className="print:block hidden">
            {pages}
        </div>
    );
});

ComponentePartida.displayName = 'ComponentePartida';
export default ComponentePartida;
