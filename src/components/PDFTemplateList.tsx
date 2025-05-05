import React from 'react';
import { supabase } from '../lib/supabase';
import { PDFTemplate } from '../types';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export function PDFTemplateList() {
  const [templates, setTemplates] = React.useState<PDFTemplate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching templates:", error);
        throw error;
      }

      if (data) {
        console.log("Loaded templates:", data);
        setTemplates(data);
      } else {
        console.log("No templates found.");
        setTemplates([]);
      }
    } catch (error: any) {
      console.error("Failed to load templates:", error);
      setError(error.message);
      toast.error(`Failed to load templates: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pdf_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTemplates(templates.filter(template => template.id !== id));
      toast.success('Template deleted successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Error Loading Templates</h2>
        <p>{error}</p>
        <button 
          onClick={loadTemplates}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">PDF Templates</h1>
        <button
          onClick={() => navigate('/templates/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          New Template
        </button>
      </div>
      
      {templates.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-md p-8">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No templates yet</h3>
          <p className="text-gray-500 text-center">
            Create your first template to start managing vehicle usage forms.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{template.name}</h3>
                    <p className="text-sm text-gray-500">
                      Created {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigate(`/templates/${template.id}`)}
                    className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-100"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-100"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
