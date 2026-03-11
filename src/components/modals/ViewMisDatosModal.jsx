
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const ViewMisDatosModal = ({ isOpen, onClose, data }) => {
    if (!data) return null;

    const DetailItem = ({ label, value }) => (
        <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value || '---'}</span>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalles del Registro">
            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar pb-4">
                <div>
                    <h4 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider border-b-2 border-gray-100 pb-2 mb-4">Datos Generales</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailItem label="Código (IDCOD)" value={data.idcod} />
                        <DetailItem label="Nombre" value={data.nombre} />
                        <DetailItem label="NIT / Cédula" value={data.nronit} />
                        <DetailItem label="Región" value={data.region} />
                        <div className="md:col-span-2"><DetailItem label="Dirección" value={data.direccion} /></div>
                        <DetailItem label="Ciudad" value={data.ciudad} />
                        <DetailItem label="Teléfono" value={data.telefono} />
                        <DetailItem label="Fax" value={data.nrofax} />
                        <DetailItem label="Email" value={data.email} />
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-bold text-[#4B7BA7] uppercase tracking-wider border-b-2 border-gray-100 pb-2 mb-4">Datos Eclesiásticos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailItem label="Vicaría" value={data.vicaria} />
                        <DetailItem label="Decanato" value={data.decanato} />
                        <DetailItem label="Diócesis" value={data.diocesis} />
                        <DetailItem label="Obispo" value={data.obispo} />
                        <DetailItem label="Canciller" value={data.canciller} />
                        <DetailItem label="Serial" value={data.serial} />
                        <div className="md:col-span-2"><DetailItem label="Ruta" value={data.ruta} /></div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                    <Button variant="outline" onClick={onClose}>
                        <X className="w-4 h-4 mr-2" /> Cerrar
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ViewMisDatosModal;
