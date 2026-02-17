
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppData } from '@/context/AppDataContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Edit, Trash2, Printer } from 'lucide-react';

const BaptismDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, deleteBaptism } = useAppData();
  const { toast } = useToast();
  const [baptism, setBaptism] = useState(null);

  useEffect(() => {
    const found = data.baptisms.find(b => b.id === id);
    setBaptism(found);
  }, [id, data.baptisms]);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this baptism record? This action cannot be undone.')) {
      deleteBaptism(id);
      toast({
        title: "Baptism Deleted",
        description: "The baptism record has been deleted successfully.",
      });
      navigate('/baptism/list');
    }
  };

  const handlePrint = () => {
    navigate(`/baptism/print/${id}`);
  };

  if (!baptism) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Baptism record not found</p>
          <Button onClick={() => navigate('/baptism/list')} className="mt-4">
            Back to List
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>{'Baptism Details'}</title>
        <meta name="description" content="Details for baptism record" />
      </Helmet>

      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/baptism/list')}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Baptism Details</h1>
                  <p className="text-gray-600 mt-1">{baptism.firstName} {baptism.lastName}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePrint}
                  className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between pb-4 border-b">
                <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                  baptism.status === 'seated'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  Status: {baptism.status === 'seated' ? 'Seated' : 'Pending'}
                </span>
                {baptism.status === 'seated' && (
                  <div className="text-sm text-gray-600">
                    Book: {baptism.bookNumber} | Folio: {baptism.folioNumber} | No: {baptism.baptismNumber}
                  </div>
                )}
              </div>

              {/* Baptism Data */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Baptism Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="text-gray-900">{new Date(baptism.baptismDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="text-gray-900">{baptism.baptismTime || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Parish</p>
                    <p className="text-gray-900">{baptism.parish}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Celebrant Minister</p>
                    <p className="text-gray-900">{baptism.celebrantMinister}</p>
                  </div>
                </div>
              </div>

              {/* Baptized Person */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Baptized Person</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="text-gray-900">{baptism.firstName} {baptism.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sex</p>
                    <p className="text-gray-900">{baptism.sex}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Birth Date</p>
                    <p className="text-gray-900">{new Date(baptism.birthDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Document</p>
                    <p className="text-gray-900">{baptism.document || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Birth Place</p>
                    <p className="text-gray-900">
                      {[baptism.birthCity, baptism.birthMunicipality, baptism.birthDepartment, baptism.birthCountry]
                        .filter(Boolean)
                        .join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Parents */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Parents</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Father</p>
                    <p className="text-gray-900">{baptism.fatherName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Mother</p>
                    <p className="text-gray-900">{baptism.motherName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Marital Status</p>
                    <p className="text-gray-900">{baptism.parentsMaritalStatus || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900">{baptism.parentsPhone || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-gray-900">{baptism.parentsAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{baptism.parentsEmail || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Godparents */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Godparents</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Godfather</p>
                    <p className="text-gray-900">{baptism.godfatherName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Godmother</p>
                    <p className="text-gray-900">{baptism.godmotherName || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Observations</p>
                    <p className="text-gray-900">{baptism.observations || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Registered By</p>
                    <p className="text-gray-900">{baptism.registeringUser}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Registration Date</p>
                    <p className="text-gray-900">{new Date(baptism.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default BaptismDetailPage;
