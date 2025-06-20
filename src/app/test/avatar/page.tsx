'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import './avatar-test.css';

export default function AvatarTestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState('text');
  const [isModalOpen, setModalOpen] = useState(false);
  
  // --- Text-to-Avatar State ---
  const [textGender, setTextGender] = useState('Masculino');
  const [textStyle, setTextStyle] = useState('Realista');
  const [description, setDescription] = useState('');
  const [ethnicity, setEthnicity] = useState('');

  // --- Image-to-Avatar State ---
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // --- Backend Logic (adapted from original) ---
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('prompt', description);
    formData.append('gender', textGender.toLowerCase());
    formData.append('style', textStyle.toLowerCase());
    // formData.append('ethnicity', ethnicity); // Can be added if needed by backend

    try {
      const response = await fetch('/api/create-avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falló la creación del avatar');
      }

      const result = await response.json();
      setSuccess('¡Avatar creado exitosamente! Redirigiendo...');
      router.push(`/videos/${result.videoId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedFiles.length === 0) {
          setError("Por favor, selecciona al menos una imagen.");
          return;
      }
      setLoading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      selectedFiles.forEach(file => {
          formData.append('image', file);
      });
      // Append other form data as needed, e.g., gender, style
      // formData.append('gender', '...');
      // formData.append('style', '...');

      try {
          const response = await fetch('/api/create-avatar', {
              method: 'POST',
              body: formData,
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Falló la creación del avatar desde la imagen');
          }
          const result = await response.json();
          setSuccess('¡Avatar creado exitosamente desde la imagen! Redirigiendo...');
          // Adjust redirection as needed
          // router.push(`/videos/${result.videoId}`);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };


  // --- UI Interaction Handlers ---
  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const newFiles = [...selectedFiles, ...files].slice(0, 20); // Limit to 20 files
      setSelectedFiles(newFiles);

      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(newPreviews);
      closeModal();
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);

    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]); // Clean up memory
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="avatar-test-wrapper">
      <div className="container mx-auto p-4 sm:p-6">
         {error && (
            <Alert variant="destructive" className="mb-6 fixed top-20 right-5 z-[1001] w-auto">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200 fixed top-20 right-5 z-[1001] w-auto">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

        <h1 className="page-title">Prueba de Generación de Avatares</h1>

        <div className="tabs-container">
            <div className="tab-buttons">
                <button className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}>Texto a Avatar</button>
                <button className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`} onClick={() => setActiveTab('image')}>Imagen a Avatar</button>
            </div>

            <div className={`tab-content ${activeTab === 'text' ? 'active' : ''}`} id="text-tab">
                <form className="text-avatar-section" onSubmit={handleTextSubmit}>
                    <h2 className="section-title">Crear Avatar desde Texto</h2>
                    
                    <div className="form-group">
                        <label className="form-label">Descripción del Avatar</label>
                        <textarea 
                            className="form-textarea" 
                            placeholder="Describe el avatar que deseas crear... Ejemplo: 'Un hombre de 30 años, profesional, con barba corta, cabello castaño, vestido con traje negro, expresión amigable'"
                            id="avatarDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        ></textarea>
                    </div>

                    <div className="options-grid">
                        <div className="option-group">
                            <label className="option-label">Género</label>
                            <div className="option-buttons">
                                <button type="button" className={`option-btn ${textGender === 'Masculino' ? 'active' : ''}`} onClick={() => setTextGender('Masculino')}>Masculino</button>
                                <button type="button" className={`option-btn ${textGender === 'Femenino' ? 'active' : ''}`} onClick={() => setTextGender('Femenino')}>Femenino</button>
                            </div>
                        </div>

                        <div className="option-group">
                            <label className="option-label">Estilo</label>
                            <div className="option-buttons">
                                <button type="button" className={`option-btn ${textStyle === 'Realista' ? 'active' : ''}`} onClick={() => setTextStyle('Realista')}>Realista</button>
                                <button type="button" className={`option-btn ${textStyle === 'Caricatura' ? 'active' : ''}`} onClick={() => setTextStyle('Caricatura')}>Caricatura</button>
                            </div>
                        </div>

                        <div className="option-group">
                            <label className="option-label">Etnia</label>
                            <select className="dropdown-select" id="ethnicity" value={ethnicity} onChange={(e) => setEthnicity(e.target.value)}>
                                <option value="">No especificar</option>
                                <option value="caucasian">Caucásico</option>
                                <option value="hispanic">Hispano</option>
                                <option value="african">Africano</option>
                                <option value="asian">Asiático</option>
                                <option value="middle-eastern">Medio Oriente</option>
                                <option value="indigenous">Indígena</option>
                                <option value="mixed">Mixto</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="create-btn" disabled={loading}>
                        {loading ? 'Creando Avatar...' : 'Crear Avatar'}
                    </button>
                </form>
            </div>

            <div className={`tab-content ${activeTab === 'image' ? 'active' : ''}`} id="image-tab">
                <form className="image-avatar-section" onSubmit={handleImageSubmit}>
                    <h2 className="section-title">Generar Avatar desde Imagen</h2>
                    <p className="process-description">
                        Crea un avatar personalizado a partir de tus fotos siguiendo estos pasos:
                    </p>

                    <div className="process-steps">
                        <div className="steps-visual">
                            <div className="step-card">
                                <div className="step-number">1</div>
                                <h3 className="step-title">Subir Imágenes</h3>
                                <p className="step-description">
                                    Selecciona al menos 10 fotos claras de tu rostro
                                </p>
                            </div>
                            <div className="step-card">
                                <div className="step-number">2</div>
                                <h3 className="step-title">Entrenamiento</h3>
                                <p className="step-description">
                                    El modelo aprende las características de tu rostro
                                </p>
                            </div>
                            <div className="step-card">
                                <div className="step-number">3</div>
                                <h3 className="step-title">Generación</h3>
                                <p className="step-description">
                                    Creación de tus avatares personalizados
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="upload-section">
                        <label className="upload-label">Imágenes de Referencia (Mínimo 10 fotos)</label>
                        {selectedFiles.length === 0 ? (
                            <div className="upload-area" onClick={openModal}>
                                <div className="upload-icon">📤</div>
                                <div className="upload-text">Click para subir múltiples fotos</div>
                                <div className="upload-hint">Se requieren al menos 10 fotos de alta calidad</div>
                            </div>
                        ) : (
                            <div className="selected-files show">
                                <div className="files-header">
                                    <span className="files-count">{selectedFiles.length} fotos seleccionadas</span>
                                    <button type="button" className="change-photos-btn" onClick={openModal}>Cambiar fotos</button>
                                </div>
                                <div className="files-grid">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="file-item">
                                            <img src={preview} alt={`preview ${index}`} className="file-preview" />
                                            <div className="file-remove" onClick={() => removeFile(index)}>×</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Demo files display when no files are selected */}
                        {selectedFiles.length === 0 && (
                            <div className="selected-files show">
                                <div className="files-header">
                                    <span className="files-count">12 fotos seleccionadas</span>
                                    <button type="button" className="change-photos-btn" onClick={openModal}>Cambiar fotos</button>
                                </div>
                                <div className="files-grid">
                                    {/* Demo file items */}
                                    <div className="file-item">
                                        <div style={{width: '100%', height: '100%', background: 'linear-gradient(45deg, #0ea5e9, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem'}}>IMG_001</div>
                                        <div className="file-remove">×</div>
                                    </div>
                                    <div className="file-item">
                                        <div style={{width: '100%', height: '100%', background: 'linear-gradient(45deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem'}}>IMG_002</div>
                                        <div className="file-remove">×</div>
                                    </div>
                                    <div className="file-item">
                                        <div style={{width: '100%', height: '100%', background: 'linear-gradient(45deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem'}}>IMG_003</div>
                                        <div className="file-remove">×</div>
                                    </div>
                                    <div className="file-item">
                                        <div style={{width: '100%', height: '100%', background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem'}}>IMG_004</div>
                                        <div className="file-remove">×</div>
                                    </div>
                                    <div className="file-item">
                                        <div style={{width: '100%', height: '100%', background: 'linear-gradient(45deg, #06b6d4, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem'}}>IMG_005</div>
                                        <div className="file-remove">×</div>
                                    </div>
                                    <div className="file-item">
                                        <div style={{width: '100%', height: '100%', background: 'linear-gradient(45deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem'}}>IMG_006</div>
                                        <div className="file-remove">×</div>
                                    </div>
                                    <div className="file-item">
                                        <div style={{width: '100%', height: '100%', background: 'linear-gradient(45deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem'}}>IMG_007</div>
                                        <div className="file-remove">×</div>
                                    </div>
                                    <div className="file-item">
                                        <div style={{width: '100%', height: '100%', background: 'linear-gradient(45deg, #84cc16, #65a30d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem'}}>IMG_008</div>
                                        <div className="file-remove">×</div>
                                    </div>
                                    <div className="file-item">
                                        <div style={{width: '100%', height: '100%', background: 'linear-gradient(45deg, #ec4899, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem'}}>IMG_009</div>
                                        <div className="file-remove">×</div>
                                    </div>
                                    <div className="file-item">
                                        <div style={{width: '100%', height: '100%', background: 'linear-gradient(45deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem'}}>IMG_010</div>
                                        <div className="file-remove">×</div>
                                    </div>
                                    <div className="file-item">
                                        <div style={{width: '100%', height: '100%', background: 'linear-gradient(45deg, #14b8a6, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem'}}>IMG_011</div>
                                        <div className="file-remove">×</div>
                                    </div>
                                    <div className="file-item">
                                        <div style={{width: '100%', height: '100%', background: 'linear-gradient(45deg, #a855f7, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem'}}>IMG_012</div>
                                        <div className="file-remove">×</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button type="submit" className={`process-btn ${selectedFiles.length >= 1 ? 'enabled' : ''}`} disabled={loading || selectedFiles.length < 1}>
                        {loading ? 'Procesando...' : 'Comenzar Proceso'}
                    </button>
                </form>
            </div>
        </div>
      </div>

      {isModalOpen && (
          <div className="modal-overlay active" onClick={closeModal}>
              <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                      <h2 className="modal-title">Subir Fotos de tu Avatar</h2>
                      <p className="modal-subtitle">Sube fotos para crear múltiples looks para tu avatar</p>
                      <button className="modal-close" onClick={closeModal}>✕</button>
                  </div>
                  
                  <div className="modal-content">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/png, image/jpeg, image/heic, image/webp" style={{ display: 'none' }} />
                      <div className="modal-upload-area" onClick={triggerFileSelect}>
                          <div className="modal-upload-icon">📤</div>
                          <div className="modal-upload-text">Arrastra y suelta fotos aquí</div>
                          <div className="modal-upload-hint">Sube PNG, JPG, HEIC, o WebP hasta 200MB cada una</div>
                          <button type="button" className="select-photos-btn">Seleccionar Fotos</button>
                      </div>
                      
                      <div className="photo-requirements">
                        <h3 className="requirements-title">Requisitos de Fotos</h3>
                        
                        <div className="requirement-section">
                            <div className="requirement-header">
                                <div className="requirement-icon good">✓</div>
                                <h4 className="requirement-title">Fotos Buenas</h4>
                            </div>
                            <p className="requirement-description">
                                Fotos recientes tuyas (solo tú), mostrando una mezcla de primeros planos y tomas de cuerpo completo, 
                                con diferentes ángulos, expresiones (sonriendo, neutral, serio), y una variedad de outfits. 
                                Asegúrate de que sean de alta resolución y reflejen tu apariencia actual.
                            </p>
                            <div className="examples-grid">
                                <div className="example-photo">
                                    <div className="example-img" style={{background: 'linear-gradient(45deg, #0ea5e9, #7c3aed)'}}>Primer plano</div>
                                    <div className="example-status good">✓</div>
                                </div>
                                <div className="example-photo">
                                    <div className="example-img" style={{background: 'linear-gradient(45deg, #22c55e, #16a34a)'}}>Cuerpo completo</div>
                                    <div className="example-status good">✓</div>
                                </div>
                                <div className="example-photo">
                                    <div className="example-img" style={{background: 'linear-gradient(45deg, #f59e0b, #d97706)'}}>Diferentes ángulos</div>
                                    <div className="example-status good">✓</div>
                                </div>
                                <div className="example-photo">
                                    <div className="example-img" style={{background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)'}}>Expresiones</div>
                                    <div className="example-status good">✓</div>
                                </div>
                                <div className="example-photo">
                                    <div className="example-img" style={{background: 'linear-gradient(45deg, #06b6d4, #0891b2)'}}>Varios outfits</div>
                                    <div className="example-status good">✓</div>
                                </div>
                            </div>
                        </div>

                        <div className="requirement-section">
                            <div className="requirement-header">
                                <div className="requirement-icon bad">✕</div>
                                <h4 className="requirement-title">Fotos Malas</h4>
                            </div>
                            <p className="requirement-description">
                                No fotos grupales, sombreros, lentes de sol, mascotas, filtros pesados, imágenes de baja resolución, 
                                o capturas de pantalla. Evita fotos demasiado antiguas, muy editadas, o que no representen cómo te ves actualmente.
                            </p>
                            <div className="examples-grid">
                                <div className="example-photo">
                                    <div className="example-img" style={{background: 'linear-gradient(45deg, #ef4444, #dc2626)'}}>Fotos grupales</div>
                                    <div className="example-status bad">✕</div>
                                </div>
                                <div className="example-photo">
                                    <div className="example-img" style={{background: 'linear-gradient(45deg, #f97316, #ea580c)'}}>Con lentes</div>
                                    <div className="example-status bad">✕</div>
                                </div>
                                <div className="example-photo">
                                    <div className="example-img" style={{background: 'linear-gradient(45deg, #84cc16, #65a30d)'}}>Capturas</div>
                                    <div className="example-status bad">✕</div>
                                </div>
                                <div className="example-photo">
                                    <div className="example-img" style={{background: 'linear-gradient(45deg, #ec4899, #db2777)'}}>Filtros pesados</div>
                                    <div className="example-status bad">✕</div>
                                </div>
                                <div className="example-photo">
                                    <div className="example-img" style={{background: 'linear-gradient(45deg, #6366f1, #4f46e5)'}}>Baja resolución</div>
                                    <div className="example-status bad">✕</div>
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                      <button type="button" className="modal-btn cancel" onClick={closeModal}>Cancelar</button>
                      <button type="button" className="modal-btn upload" onClick={triggerFileSelect}>Subir Fotos</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
} 