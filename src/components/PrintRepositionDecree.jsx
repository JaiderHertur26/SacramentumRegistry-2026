import React, { forwardRef } from 'react';
import { convertDateToSpanishTextNatural } from '@/utils/dateTimeFormatters';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';

const PrintRepositionDecree = forwardRef(({ decreeData }, ref) => {
  const { getMisDatosList, getParrocos, data: globalData } = useAppData();
  const { user: authUser } = useAuth(); 

  if (!decreeData) return null;

  const {
    decreeNumber,
    decreeDate,
    parroquia,
    targetName,
    newPartidaSummary = {},
    datosNuevaPartida = {},
    isMasterCopy,          
    targetParishName,      
    nombreSacerdoteDestino 
  } = decreeData;

  let currentDioceseId = authUser?.dioceseId;
  if (!currentDioceseId && authUser?.parishId && globalData?.parishes) {
      const userParish = globalData.parishes.find(p => p.id === authUser.parishId);
      if (userParish) currentDioceseId = userParish.dioceseId;
  }

  const cancilleria = (globalData?.chancellors || []).find(c => c.dioceseId === currentDioceseId)
                    || (globalData?.chancelleries || []).find(c => c.dioceseId === currentDioceseId)
                    || {};

  const misDatosList = authUser?.parishId ? getMisDatosList(authUser.parishId) : [];
  const misDatos = misDatosList[0] || {};

  const orgData = {
    name: 'CURIA ARZOBISPAL - CANCILLERÍA',
    address: cancilleria.address || '[Dirección no configurada]',
    phone: cancilleria.phone || '[Teléfono no configurado]',
    city: misDatos.ciudad || 'Barranquilla',
    country: misDatos.pais || 'Colombia',
    email: cancilleria.email || cancilleria.contactEmail || '[Email no configurado]',
    website: misDatos.website || '' 
  };

  const cancillerName = cancilleria.name || 'CANCILLER DIOCESANO';

  // --- LÓGICA INTELIGENTE DE DESTINATARIO Y FIRMA ---
  let finalTargetParishName = '[NOMBRE PARROQUIA]';
  let finalTargetCity = 'BARRANQUILLA';
  let nombreDaFeFinal = 'PÁRROCO ENCARGADO';

  if (isMasterCopy && targetParishName) {
      const parts = targetParishName.split('-');
      finalTargetParishName = parts[0]?.trim() || finalTargetParishName;
      finalTargetCity = parts[1]?.trim() || finalTargetCity;
      nombreDaFeFinal = nombreSacerdoteDestino || nombreDaFeFinal;
  } else {
      const [parishNameFromDecree, parishCityFromDecree] = (parroquia || '').split('-').map(s => s.trim());
      finalTargetParishName = parishNameFromDecree || misDatos.nombre || authUser?.parishName || finalTargetParishName;
      finalTargetCity = parishCityFromDecree || misDatos.ciudad || finalTargetCity;
      
      const parrocos = (authUser?.parishId && typeof getParrocos === 'function') ? getParrocos(authUser.parishId) : [];
      const parrocoActivo = parrocos.find(p => {
          const estadoStr = String(p.estado || p.Estado || '').toUpperCase();
          return estadoStr === '1' || estadoStr === 'ACTIVO' || estadoStr === 'ACTIVE';
      });
      if (parrocoActivo) {
          const nombre = parrocoActivo.nombre || parrocoActivo.nombres || '';
          const apellido = parrocoActivo.apellido || parrocoActivo.apellidos || '';
          nombreDaFeFinal = `${nombre} ${apellido}`.trim();
      }
  }

  // Objeto con todos los datos capturados
  const bd = datosNuevaPartida || newPartidaSummary || {};
  
  let rawDaFe = bd.ministerFaith || bd.daFe || bd.dafe || '';
  if (!rawDaFe || !isNaN(rawDaFe) || rawDaFe.trim().length < 3) {
      rawDaFe = nombreDaFeFinal;
  }

  // --- TRADUCCIÓN DE TIPO DE UNIÓN Y SEXO ---
  const unionTypeMap = { '1': 'Matrimonio Católico', '2': 'Matrimonio Civil', '3': 'Unión Libre', '4': 'Madre Soltera', '5': 'Otro' };
  const rawUnion = String(bd.tipoUnionPadres || bd.tipohijo || '---');
  const unionTypeFinal = unionTypeMap[rawUnion] || rawUnion;

  const rawSex = String(bd.sex || bd.sexo || '1').toUpperCase();
  const sexFinal = (rawSex === '1' || rawSex === 'MASCULINO' || rawSex === 'M') ? 'Masculino' : 'Femenino';

  // --- TRADUCTOR DEFINITIVO DE REGISTRO CIVIL ---
  const sr = bd.serialRegistro || bd.serialRegCivil || bd.registroCivil || bd.regciv || '---';
  const nu = bd.nuip || bd.nuipNuit || bd.identificacion || '---';
  const of = bd.oficinaRegistro || bd.notaria || '---';
  const fe = bd.fechaExpedicionRegistro || bd.fechaExpedicion || bd.fecregis || '---';

  // --- CONSTRUCCIÓN DEL REGISTRO COMPLETO ---
  const baptismRecord = {
    book: bd.book || bd.numeroLibro || bd.book_number || '---',
    page: bd.page || bd.folio || bd.page_number || '---',
    entry: bd.entry || bd.numeroActa || bd.entry_number || '---',
    sacramentDate: bd.sacramentDate || bd.fechaSacramento || bd.fecbau || '---', 
    firstName: bd.firstName || bd.nombres || '---',
    lastName: bd.lastName || bd.apellidos || '---',
    birthDate: bd.birthDate || bd.fechaNacimiento || bd.fecnac || '---', 
    birthPlace: bd.lugarNacimientoDetalle || bd.lugarNacimiento || bd.lugarn || '---', 
    father: bd.fatherName || bd.nombrePadre || bd.padre || '---',
    mother: bd.motherName || bd.nombreMadre || bd.madre || '---',
    unionType: unionTypeFinal,
    sex: sexFinal,
    paternalGrandparents: bd.paternalGrandparents || bd.abuelosPaternos || bd.abuepat || '---',
    maternalGrandparents: bd.maternalGrandparents || bd.abuelosMaternos || bd.abuemat || '---',
    godparents: bd.godparents || bd.padrinos || '---',
    minister: bd.minister || bd.ministro || '---',
    daFe: rawDaFe,
    // Nuevos campos de Registro Civil mapeados
    serialRegCivil: sr,
    nuipNuit: nu,
    oficinaRegistro: of,
    fechaExpedicion: fe
  };

  const fullName = targetName || `${baptismRecord.firstName} ${baptismRecord.lastName}`.trim().toUpperCase();
  
  const getFormattedDate = (dateStr) => {
      if (!dateStr) return '---';
      try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr;
          return convertDateToSpanishTextNatural(dateStr);
      } catch(e) {
          return dateStr;
      }
  };
  const formattedDate = getFormattedDate(decreeDate || decreeData.fechaDecreto);

  const DataRow = ({ label, value, bold }) => (
    <div className="flex items-end mb-1">
      <span className="font-semibold text-black uppercase tracking-wider text-[8.5pt] w-40 shrink-0">{label}:</span>
      <span className={`font-mono flex-1 border-b border-dotted border-gray-500 pl-2 uppercase text-[9.5pt] leading-tight text-black ${bold ? 'font-bold' : ''}`}>
        {value || '\u00A0'}
      </span>
    </div>
  );

  return (
    <div id="printable-content" ref={ref} className="bg-white text-black font-serif p-8 max-w-[216mm] mx-auto min-h-[279mm] flex flex-col shadow-xl print:shadow-none print:p-0 print:m-0 print:w-full box-border relative">
      <style>{`
        @media print {
          @page { margin: 12mm; size: letter; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          #printable-content, #printable-content * { visibility: visible; }
          #printable-content { position: absolute; left: 0; top: 0; width: 100%; height: auto; min-height: 100%; }
        }
      `}</style>

      {/* BLOQUE SUPERIOR */}
      <div className="w-full flex-1">
          <div className="text-center mb-5 relative border-b-2 border-black pb-3">
            <h1 className="text-[13pt] font-extrabold uppercase tracking-widest mb-1 text-black">Arquidiócesis de Barranquilla</h1>
            <h2 className="text-[10pt] font-semibold uppercase tracking-widest text-black">Oficina de Cancillería</h2>
            <div className="mt-3 inline-block border-2 border-black px-4 py-1.5 bg-gray-50 print:bg-gray-100">
               <span className="font-bold uppercase tracking-wider text-[11pt] text-black">Decreto de Reposición de Partida</span>
            </div>
            <div className="absolute right-0 top-0 text-[7pt] font-mono text-black font-bold text-right leading-tight">
              CÓDIGO: CAL-ODC-022<br/>VERSIÓN: 001
            </div>
          </div>

          <div className="flex justify-between items-end mb-4">
            <div className="w-2/3 text-justify text-[10pt] pr-4 text-black">
               <p>Al Señor Cura Párroco de la Parroquia <strong>{finalTargetParishName}</strong>, de <span className="uppercase font-semibold">{finalTargetCity}</span>.</p>
            </div>
            <div className="w-1/3 text-right border-2 border-black p-2 bg-gray-50 print:bg-gray-100">
              <div className="font-bold text-[7pt] uppercase tracking-widest text-black">Decreto Número</div>
              <div className="font-mono text-xl font-bold tracking-wider text-black">{decreeNumber || decreeData.numeroDecreto || '---'}</div>
              <div className="font-bold text-[7pt] uppercase tracking-widest text-black mt-1 border-t border-black pt-1">Fecha de Emisión</div>
              <div className="font-mono text-[8pt] uppercase font-semibold text-black">{formattedDate}</div>
            </div>
          </div>

          <div className="mb-4 text-[10pt] text-black">
            <p className="text-justify leading-relaxed">
              Por el presente documento, ante la pérdida o deterioro del registro original, el Gobierno de la Arquidiócesis autoriza y ordena asentar una <strong>PARTIDA SUPLETORIA DE BAUTISMO</strong> a nombre de:
            </p>
            <div className="text-center mt-2">
                <span className="font-bold text-[12pt] uppercase tracking-wider border-b-2 border-black inline-block min-w-[70%] pb-1">{fullName || '---'}</span>
            </div>
          </div>

          <div className="mb-4 border-2 border-black p-4 relative pt-5 mt-5">
            <div className="absolute -top-3 left-4 bg-white px-3 font-bold text-[8pt] tracking-widest uppercase text-black">
              Detalles a Asentar (Supletorio)
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4 border-b-2 border-black pb-2 bg-gray-50 print:bg-gray-100 p-2 rounded">
              <div className="text-center"><span className="text-[7.5pt] font-bold text-black uppercase block tracking-wider">Libro Supletorio</span><span className="font-mono font-bold text-[12pt] text-black">{baptismRecord.book}</span></div>
              <div className="text-center border-l border-r border-black"><span className="text-[7.5pt] font-bold text-black uppercase block tracking-wider">Folio</span><span className="font-mono font-bold text-[12pt] text-black">{baptismRecord.page}</span></div>
              <div className="text-center"><span className="text-[7.5pt] font-bold text-black uppercase block tracking-wider">Número</span><span className="font-mono font-bold text-[12pt] text-black">{baptismRecord.entry}</span></div>
            </div>

            <div className="space-y-1">
              <DataRow label="Fecha de Bautismo" value={baptismRecord.sacramentDate} />
              <DataRow label="Nombres" value={baptismRecord.firstName} />
              <DataRow label="Apellidos" value={baptismRecord.lastName} />
              <DataRow label="Fecha Nacimiento" value={baptismRecord.birthDate} />
              <DataRow label="Lugar Nacimiento" value={baptismRecord.birthPlace} />
              <DataRow label="Padre" value={baptismRecord.father} />
              <DataRow label="Madre" value={baptismRecord.mother} />
              
              <div className="flex w-full mb-1">
                <div className="w-1/2 flex items-end pr-2">
                    <span className="font-semibold text-black uppercase tracking-wider text-[8.5pt] w-40 shrink-0">Tipo de Unión:</span>
                    <span className="font-mono flex-1 border-b border-dotted border-gray-500 pl-1 uppercase text-[9.5pt] text-black">{baptismRecord.unionType}</span>
                </div>
                <div className="w-1/2 flex items-end pl-2">
                    <span className="font-semibold text-black uppercase tracking-wider text-[8.5pt] w-12 shrink-0">Sexo:</span>
                    <span className="font-mono flex-1 border-b border-dotted border-gray-500 pl-1 uppercase text-[9.5pt] text-black">{baptismRecord.sex}</span>
                </div>
              </div>

              <DataRow label="Abuelos Paternos" value={baptismRecord.paternalGrandparents} />
              <DataRow label="Abuelos Maternos" value={baptismRecord.maternalGrandparents} />
              <DataRow label="Padrinos" value={baptismRecord.godparents} />
              <DataRow label="Ministro" value={baptismRecord.minister} />
              <DataRow label="Da Fe" value={baptismRecord.daFe} bold />

              {/* BLOQUE DE REGISTRO CIVIL AÑADIDO PARA IGUALAR A PARROQUIA */}
              <div className="flex w-full mb-1 mt-2">
                <div className="w-1/2 flex items-end pr-2">
                  <span className="font-semibold text-black uppercase tracking-wider text-[8.5pt] w-28 shrink-0">Reg. Civil:</span>
                  <span className="font-mono flex-1 border-b border-dotted border-gray-500 pl-1 uppercase text-[8.5pt] text-black">{baptismRecord.serialRegCivil}</span>
                </div>
                <div className="w-1/2 flex items-end pl-2">
                  <span className="font-semibold text-black uppercase tracking-wider text-[8.5pt] w-12 shrink-0">NUIP:</span>
                  <span className="font-mono flex-1 border-b border-dotted border-gray-500 pl-1 uppercase text-[8.5pt] text-black">{baptismRecord.nuipNuit}</span>
                </div>
              </div>
              <DataRow label="Oficina Registro" value={`${baptismRecord.oficinaRegistro} - Exp: ${baptismRecord.fechaExpedicion}`} />
            </div>
          </div>

          <div className="mb-3 relative border-2 border-black p-3 bg-gray-50 print:bg-gray-100 mt-5">
             <div className="absolute -top-3 left-4 bg-gray-50 print:bg-gray-100 px-2 font-bold text-[8pt] tracking-widest uppercase border-2 border-black border-b-0 text-black">
              Disposición
            </div>
            <p className="font-mono text-[9pt] leading-relaxed text-justify mt-1 text-black font-semibold">
              CÓPIESE FIELMENTE ESTA INFORMACIÓN EN EL LIBRO SUPLETORIO DE BAUTISMOS DE LA PARROQUIA.
            </p>
          </div>
      </div>

      {/* BLOQUE INFERIOR */}
      <div className="w-full mt-auto pt-12 break-inside-avoid">
          <div className="flex justify-between items-end px-12 mb-6">
            <div className="text-center w-5/12">
              <div className="border-t-2 border-black pt-1 font-bold uppercase text-[9pt] tracking-wide text-black">
                {cancillerName}
              </div>
              <div className="text-[7.5pt] font-bold text-black uppercase tracking-widest mt-0.5">
                 Canciller Diocesano
              </div>
            </div>
            <div className="text-center w-1/3">
              <div className="h-24 w-24 border-2 border-dotted border-black rounded-full mx-auto flex items-center justify-center text-black text-[9px] font-bold uppercase tracking-widest text-center leading-tight p-2">
                Sello<br/>Cancillería
              </div>
            </div>
          </div>

          <div className="w-full text-center text-[7.5pt] text-black border-t-2 border-black pt-2">
            <p className="font-extrabold uppercase tracking-widest mb-0.5">{orgData.name}</p>
            <p className="font-medium">{orgData.address} • Tel: {orgData.phone} • {orgData.city}, {orgData.country}</p>
            <p className="font-medium">{orgData.website ? `${orgData.website} • ` : ''}E-mail: {orgData.email}</p>
          </div>
      </div>
    </div>
  );
});

PrintRepositionDecree.displayName = 'PrintRepositionDecree';
export default PrintRepositionDecree;