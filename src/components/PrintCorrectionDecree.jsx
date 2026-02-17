
import React, { forwardRef } from 'react';
import { convertDateToSpanishTextNatural } from '@/utils/dateTimeFormatters';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { ROLE_TYPES } from '@/config/supabaseConfig';

const PrintCorrectionDecree = forwardRef(({ decreeData }, ref) => {
  // Access Context for Organization/Parish Data
  const { getMisDatosList } = useAppData();
  
  // Get current authenticated user details
  const { user: authUser } = useAuth(); 

  if (!decreeData) return null;

  const {
    decreeNumber,
    decreeDate,
    parroquia,
    baptismData = {},
    originalPartidaSummary = {},
    newData = {}
  } = decreeData;

  // 1. Extract Organization/Issuer Data from MisDatos (Header/Footer & Default Parish Info)
  const currentContextId = authUser?.parishId || authUser?.dioceseId;
  const misDatosList = currentContextId ? getMisDatosList(currentContextId) : [];
  const misDatos = misDatosList[0] || {};

  // 2. Extract Target Parish Data from Decree (Destination)
  const [parishNameFromDecree, parishCityFromDecree] = (parroquia || '').split('-').map(s => s.trim());

  // 3. Resolve Final Values with Fallbacks (Updated to use MisDatos)
  const targetParishName = parishNameFromDecree || misDatos.nombre || authUser?.parishName || '[NOMBRE PARROQUIA]';
  const targetCity = parishCityFromDecree || misDatos.ciudad || 'CIUDAD';

  const orgData = {
    name: misDatos.nombre || 'Arquidiócesis de Barranquilla', 
    address: misDatos.direccion || 'Calle 75 B No. 42 F - 83',
    phone: misDatos.telefono || '3855158 - 3093152',
    city: misDatos.ciudad || 'Barranquilla',
    country: misDatos.pais || 'Colombia',
    email: misDatos.email || 'cancilleria@arquidiocesisbaq.org',
    website: misDatos.website || 'www.arquidiocesisbaq.org'
  };

  let officeName = "Oficina de Cancillería";
  
  if (authUser && authUser.role === ROLE_TYPES.PARISH) {
    if (misDatos.nombre) {
      officeName = misDatos.nombre;
    } else {
      officeName = authUser.parishName ? `Parroquia ${authUser.parishName}` : "Despacho Parroquial";
    }
  } else if (authUser && authUser.role === ROLE_TYPES.CHANCERY) {
    officeName = "Oficina de Cancillería";
  }

  // Helper to get value from either primary source (baptismData) or fallbacks
  const getVal = (key, altKey) => {
    return newData[key] || baptismData[key] || baptismData[altKey] || originalPartidaSummary[key] || originalPartidaSummary[altKey] || '---';
  };

  // Helper to safely get nested godparent names
  const getGodparents = () => {
    // 1. Try to get from newData first (the updated/corrected data in the decree)
    const newGodfather = newData.padrino_nombre || newData.padrino || '';
    const newGodfatherLast = newData.padrino_apellido || '';
    const newGodmother = newData.madrina_nombre || newData.madrina || '';
    const newGodmotherLast = newData.madrina_apellido || '';

    if (newGodfather || newGodfatherLast || newGodmother || newGodmotherLast) {
      const godfather = `${newGodfather} ${newGodfatherLast}`.trim();
      const godmother = `${newGodmother} ${newGodmotherLast}`.trim();
      const parts = [];
      if (godfather) parts.push(godfather);
      if (godmother) parts.push(godmother);
      return parts.length > 0 ? parts.join(' y ') : '---';
    }

    // 2. Try to get from standard baptismData structure (original record)
    const val = baptismData.godparents || baptismData.padrinos || originalPartidaSummary.godparents || originalPartidaSummary.padrinos;
    if (Array.isArray(val)) return val.map(g => g.name || g).join(', ');
    if (typeof val === 'string' && val.trim() !== '') return val;
    
    // 3. Try flat fields on baptismData or originalPartidaSummary
    const source = (baptismData.padrino || baptismData.madrina) ? baptismData : originalPartidaSummary;
    if (source.padrino || source.madrina || source.padrino_nombre || source.madrina_nombre) {
      const pf = source.padrino_nombre || source.padrino || '';
      const pl = source.padrino_apellido || '';
      const mf = source.madrina_nombre || source.madrina || '';
      const ml = source.madrina_apellido || '';

      const godfather = `${pf} ${pl}`.trim();
      const godmother = `${mf} ${ml}`.trim();
      const parts = [];
      if (godfather) parts.push(godfather);
      if (godmother) parts.push(godmother);
      return parts.length > 0 ? parts.join(' y ') : '---';
    }

    return '---';
  };

  const data = {
    book: originalPartidaSummary.book || originalPartidaSummary.book_number || '---',
    page: originalPartidaSummary.page || originalPartidaSummary.page_number || '---',
    entry: originalPartidaSummary.entry || originalPartidaSummary.entry_number || '---',
    sacramentDate: getVal('sacramentDate', 'fecbau'), 
    firstName: getVal('firstName', 'nombres'),
    lastName: getVal('lastName', 'apellidos'),
    birthDate: getVal('birthDate', 'fecnac'), 
    birthPlace: getVal('lugarNacimientoDetalle', 'lugarn'), 
    father: getVal('fatherName', 'padre'),
    mother: getVal('motherName', 'madre'),
    unionTypeRaw: getVal('tipoUnionPadres', 'tipohijo'),
    sexRaw: getVal('sex', 'sexo'),
    paternalGrandparents: getVal('paternalGrandparents', 'abuepat'),
    maternalGrandparents: getVal('maternalGrandparents', 'abuemat'),
    godparents: getGodparents(),
    minister: getVal('minister', 'ministro'),
    daFe: getVal('ministerFaith', 'dafe')
  };

  const unionTypeMap = {
    '1': 'Matrimonio Católico',
    '2': 'Matrimonio Civil',
    '3': 'Unión Libre',
    '4': 'Madre Soltera',
    '5': 'Otro'
  };
  data.unionType = unionTypeMap[String(data.unionTypeRaw)] || data.unionTypeRaw || 'Otro';
  data.sex = (String(data.sexRaw) === '1' || String(data.sexRaw).toUpperCase() === 'MASCULINO' || String(data.sexRaw).toUpperCase() === 'M') ? 'Masculino' : 'Femenino';

  const fullName = `${data.firstName} ${data.lastName}`.trim().toUpperCase();
  const formattedDate = decreeDate ? convertDateToSpanishTextNatural(decreeDate) : '---';

  return (
    <div id="printable-content" ref={ref} className="bg-white text-black font-serif p-12 max-w-[210mm] mx-auto min-h-[297mm] relative text-[10pt] leading-relaxed">
      <style>{`
        @media print {
          @page { margin: 0; size: auto; }
          body * { visibility: hidden; }
          #printable-content, #printable-content * { visibility: visible; }
          #printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 15mm 20mm;
            background: white;
            height: 100%;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="text-center mb-8 relative">
        <h1 className="text-lg font-bold leading-tight uppercase tracking-wide">
          Gobierno de la Arquidiócesis de Barranquilla<br/>
          {officeName}<br/>
          <span className="mt-2 block text-base font-semibold">Decreto de Corrección Partida de Bautismo</span>
        </h1>
        <div className="text-right mt-4 text-[8pt] font-bold text-gray-600">
          CAL-ODC-021, Versión 001
        </div>
      </div>

      {/* GREETING */}
      <div className="mb-6 text-justify px-2">
        <p>
          Atentamente ruego al Señor Cura Párroco de la Parroquia <span className="font-bold">{targetParishName}</span>, 
          de <span className="font-bold uppercase">{targetCity}</span>.
        </p>
      </div>

      {/* DECREE NUMBER & DATE */}
      <div className="mb-6 px-2">
        <div className="flex gap-4 mb-1 items-baseline">
          <span className="font-bold w-28 uppercase text-sm">Decreto No.:</span>
          <span className="font-bold text-lg">{decreeNumber || '---'}</span>
        </div>
        <div className="flex gap-4 items-baseline">
          <span className="font-bold w-28 uppercase text-sm">Fecha:</span>
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* INTRO */}
      <div className="mb-6 text-justify px-2">
        <p>
          Por el cual se anula la Partida de BAUTISMO de: <span className="font-bold uppercase text-base">{fullName || '---'}</span>.
        </p>
      </div>

      {/* RECORD DETAILS */}
      <div className="mb-8 border-t-2 border-b-2 border-black py-4 text-sm px-2">
        <div className="flex mb-2 pb-2 border-b border-gray-200">
          <div className="flex-1 flex items-baseline">
            <span className="font-bold text-xs uppercase w-16">Libro:</span>
            <span className="font-mono text-base">{data.book}</span>
          </div>
          <div className="flex-1 flex items-baseline">
            <span className="font-bold text-xs uppercase w-16">Folio:</span>
            <span className="font-mono text-base">{data.page}</span>
          </div>
          <div className="flex-1 flex items-baseline">
            <span className="font-bold text-xs uppercase w-16">Número:</span>
            <span className="font-mono text-base">{data.entry}</span>
          </div>
        </div>

        <div className="flex mb-2 pb-2 border-b border-gray-100 items-baseline">
          <span className="font-bold text-xs uppercase w-40 shrink-0">Fecha de Bautismo:</span>
          <span className="uppercase">{data.sacramentDate}</span>
        </div>

        <div className="flex mb-2 pb-2 border-b border-gray-100 items-baseline">
          <span className="font-bold text-xs uppercase w-40 shrink-0">Nombres:</span>
          <span className="uppercase font-semibold">{data.firstName}</span>
        </div>

        <div className="flex mb-2 pb-2 border-b border-gray-100 items-baseline">
          <span className="font-bold text-xs uppercase w-40 shrink-0">Apellidos:</span>
          <span className="uppercase font-semibold">{data.lastName}</span>
        </div>

        <div className="flex mb-2 pb-2 border-b border-gray-100 items-baseline">
          <span className="font-bold text-xs uppercase w-40 shrink-0">Fecha de Nacimiento:</span>
          <span className="uppercase">{data.birthDate}</span>
        </div>

        <div className="flex mb-2 pb-2 border-b border-gray-100 items-baseline">
          <span className="font-bold text-xs uppercase w-40 shrink-0">Lugar de Nacimiento:</span>
          <span className="uppercase">{data.birthPlace}</span>
        </div>

        <div className="flex mb-2 pb-2 border-b border-gray-100 items-baseline">
          <span className="font-bold text-xs uppercase w-40 shrink-0">Padre:</span>
          <span className="uppercase">{data.father}</span>
        </div>

        <div className="flex mb-2 pb-2 border-b border-gray-100 items-baseline">
          <span className="font-bold text-xs uppercase w-40 shrink-0">Madre:</span>
          <span className="uppercase">{data.mother}</span>
        </div>

        <div className="flex mb-2 pb-2 border-b border-gray-100">
          <div className="flex-1 flex items-baseline">
            <span className="font-bold text-xs uppercase w-40 shrink-0">Tipo de Unión:</span>
            <span className="uppercase">{data.unionType}</span>
          </div>
          <div className="flex-1 flex items-baseline border-l border-gray-300 pl-4">
            <span className="font-bold text-xs uppercase w-16 shrink-0">Sexo:</span>
            <span className="uppercase">{data.sex}</span>
          </div>
        </div>

        <div className="flex mb-2 pb-2 border-b border-gray-100 items-baseline">
          <span className="font-bold text-xs uppercase w-40 shrink-0">Abuelos Paternos:</span>
          <span className="uppercase text-xs">{data.paternalGrandparents}</span>
        </div>

        <div className="flex mb-2 pb-2 border-b border-gray-100 items-baseline">
          <span className="font-bold text-xs uppercase w-40 shrink-0">Abuelos Maternos:</span>
          <span className="uppercase text-xs">{data.maternalGrandparents}</span>
        </div>

        <div className="flex mb-2 pb-2 border-b border-gray-100 items-baseline">
          <span className="font-bold text-xs uppercase w-40 shrink-0">Padrinos:</span>
          <span className="uppercase text-xs">{data.godparents}</span>
        </div>

        <div className="flex mb-2 pb-2 border-b border-gray-100 items-baseline">
          <span className="font-bold text-xs uppercase w-40 shrink-0">Ministro:</span>
          <span className="uppercase">{data.minister}</span>
        </div>

        <div className="flex items-baseline">
          <span className="font-bold text-xs uppercase w-40 shrink-0">Da Fe:</span>
          <span className="uppercase">{data.daFe}</span>
        </div>
      </div>

      {/* FOOTER NOTES */}
      <div className="mb-10 space-y-4 text-sm text-justify px-2">
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <span className="font-bold underline uppercase text-xs block mb-2">Nota Marginal:</span> 
          <span>{decreeData.marginNote || `Anulada por Decreto No. ${decreeNumber} de fecha ${decreeDate}. Pasa al Libro Supletorio.`}</span>
        </div>
        
        <div className="text-[9pt] italic text-gray-600 px-2 mt-2">
          <strong>NOTA:</strong> Favor CONFIRMAR el recibo del decreto al correo: {orgData.email} o Telefónicamente. Tenga cuidado de hacer al margen la anotación del libro y folio bajo los cuales se buscará la Partida en adelante.
        </div>
      </div>

      <p className="mb-16 text-center italic text-gray-800">Muchas Gracias. Al Señor Cura Párroco, atentamente.</p>

      {/* SIGNATURES */}
      <div className="flex justify-between items-end mt-auto px-12 pb-24">
        <div className="text-center w-5/12">
          <div className="border-t border-black pt-2 font-bold uppercase text-sm tracking-wider">
            {authUser?.role === ROLE_TYPES.PARISH ? 'Párroco' : 'Canciller'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Arquidiócesis de Barranquilla</div>
        </div>
        <div className="text-center w-1/3">
          <div className="h-28 w-28 border-2 border-dashed border-gray-300 rounded-full mx-auto flex items-center justify-center text-gray-300 text-xs font-bold uppercase tracking-widest">
            [Sello]
          </div>
        </div>
      </div>

      {/* PAGE FOOTER */}
      <div className="absolute bottom-8 left-0 w-full text-center text-[7pt] text-gray-400 border-t border-gray-100 pt-3 px-12">
        <p className="font-bold uppercase tracking-wider mb-1">
          {orgData.name} • Curia Arzobispal
        </p>
        <p>
          {orgData.address} • Tel: {orgData.phone} • {orgData.city}, {orgData.country}
        </p>
        <p>
          {orgData.website} • email: {orgData.email}
        </p>
      </div>
    </div>
  );
});

PrintCorrectionDecree.displayName = 'PrintCorrectionDecree';
export default PrintCorrectionDecree;
