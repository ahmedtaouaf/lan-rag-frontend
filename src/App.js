import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Search, FileText, RefreshCw, BookOpen, Send,
  Plus, MessageSquare, Trash2, Bot, User, Sparkles, X, AlertTriangle
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/api';

export default function App() {
  // États pour les Chat Rooms et les Messages
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');

  // États pour les fichiers PDF et le viewer
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);

  // États pour les Modales personnalisées
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [roomToDelete, setRoomToDelete] = useState(null);

  const messagesEndRef = useRef(null);

  // Charger les salons et la liste des fichiers au montage
  useEffect(() => {
    fetchFiles();
    fetchRooms();
  }, []);

  // Charger les messages du salon actif lors d'un changement de salon
  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId);
    } else {
      setMessages([]);
    }
  }, [activeRoomId]);

  // Scroll automatique au bas du fil de discussion
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/files`);
      setFiles(res.data);
    } catch (err) {
      console.error('Erreur lors de la récupération des fichiers:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/chat/rooms`);
      setRooms(res.data);
      if (res.data.length > 0 && !activeRoomId) {
        setActiveRoomId(res.data[0].id);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des salons:', err);
    }
  };

  const fetchMessages = async (roomId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/chat/rooms/${roomId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement de l\'historique:', err);
    }
  };

  // --- Gestion Création de Salon ---
  const handleOpenCreateModal = () => {
    setNewRoomTitle('');
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;

    try {
      const res = await axios.post(`${API_BASE_URL}/chat/rooms`, { title: newRoomTitle.trim() });
      const newRoom = res.data;
      setRooms((prev) => [newRoom, ...prev]);
      setActiveRoomId(newRoom.id);
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Échec de la création de la discussion');
    }
  };

  // --- Gestion Suppression de Salon ---
  const handleOpenDeleteModal = (room, e) => {
    e.stopPropagation();
    setRoomToDelete(room);
  };

  const handleConfirmDeleteRoom = async () => {
    if (!roomToDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/chat/rooms/${roomToDelete.id}`);
      const updatedRooms = rooms.filter((r) => r.id !== roomToDelete.id);
      setRooms(updatedRooms);
      if (activeRoomId === roomToDelete.id) {
        setActiveRoomId(updatedRooms.length > 0 ? updatedRooms[0].id : null);
      }
      setRoomToDelete(null);
    } catch (err) {
      console.error('Échec de la suppression de la conversation');
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await axios.post(`${API_BASE_URL}/reindex`);
      await fetchFiles();
    } catch (err) {
      console.error('Échec du réindexage du dossier');
    } finally {
      setReindexing(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!question.trim() || !activeRoomId || loading) return;

    const currentQuestion = question;
    setQuestion('');

    const userMsg = {
      id: Date.now(),
      sender: 'USER',
      content: currentQuestion,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/chat/send`, {
        roomId: activeRoomId,
        question: currentQuestion
      });

      const data = res.data;

      if (data.sources && data.sources.length > 0) {
        setSelectedSource(data.sources[0]);
      }

      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'ASSISTANT',
        content: data.answer,
        sources: data.sources,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ASSISTANT',
          content: "Désolé, une erreur s'est produite lors de la génération de la réponse.",
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', margin: 0, position: 'relative' }}>
        {/* Animation CSS */}
        <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes pulseDot { 0%, 80%, 100% { transform: scale(0); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
        .typing-dot { width: 8px; height: 8px; background-color: #0284c7; border-radius: 50%; display: inline-block; animation: pulseDot 1.4s infinite ease-in-out both; }
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        .typing-dot:nth-child(3) { animation-delay: 0s; }
        .room-item:hover .trash-icon { opacity: 1 !important; }
      `}</style>

        {/* Entête principal */}
        <header style={{ backgroundColor: '#1e293b', color: 'white', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOpen style={{ color: '#38bdf8' }} />
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Assistant Documentaire LAN (RAG)</h1>
          </div>
          <button
              onClick={handleReindex}
              disabled={reindexing}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#334155', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
          >
            <RefreshCw size={16} className={reindexing ? 'spin' : ''} />
            {reindexing ? 'Réindexation...' : 'Réindexer le dossier'}
          </button>
        </header>

        {/* Conteneur principal */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Colonne 1 : Salons de Chat & Fichiers PDF */}
          <div style={{ width: '280px', backgroundColor: '#0f172a', color: '#f1f5f9', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>

            {/* Section Chat Rooms */}
            <div style={{ padding: '16px', borderBottom: '1px solid #334155' }}>
              <button
                  onClick={handleOpenCreateModal}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' }}
              >
                <Plus size={16} /> Nouvelle discussion
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
              <h2 style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', paddingLeft: '8px', marginBottom: '8px' }}>
                Conversations
              </h2>
              {rooms.map((room) => {
                const isActive = room.id === activeRoomId;
                return (
                    <div
                        key={room.id}
                        className="room-item"
                        onClick={() => setActiveRoomId(room.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: isActive ? '#1e293b' : 'transparent',
                          color: isActive ? '#38bdf8' : '#cbd5e1',
                          cursor: 'pointer',
                          marginBottom: '4px',
                          fontSize: '13px',
                          transition: 'all 0.15s ease'
                        }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <MessageSquare size={14} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.title}</span>
                      </div>
                      <button
                          className="trash-icon"
                          onClick={(e) => handleOpenDeleteModal(room, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: isActive ? 1 : 0.4,
                            transition: 'opacity 0.2s, color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                );
              })}
            </div>

            {/* Section Fichiers PDF */}
            <div style={{ borderTop: '1px solid #334155', padding: '12px 8px', height: '180px', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', paddingLeft: '8px', marginBottom: '8px' }}>
                Fichiers PDF détectés ({files.length})
              </h2>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {files.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px', backgroundColor: '#1e293b', marginBottom: '4px', fontSize: '12px' }}>
                      <FileText size={14} color="#38bdf8" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#cbd5e1' }}>{file.fileName}</span>
                    </div>
                ))}
              </div>
            </div>
          </div>

          {/* Colonne 2 : Fil de Chat principal */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', backgroundColor: 'white' }}>

            {/* Affichage des messages */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!activeRoomId && (
                  <div style={{ textAlign: 'center', marginTop: '100px', color: '#94a3b8' }}>
                    <Search size={48} style={{ marginBottom: '12px' }} />
                    <p>Créez ou sélectionnez une discussion pour commencer.</p>
                  </div>
              )}

              {activeRoomId && messages.length === 0 && !loading && (
                  <div style={{ textAlign: 'center', marginTop: '100px', color: '#94a3b8' }}>
                    <Sparkles size={48} style={{ marginBottom: '12px', color: '#38bdf8' }} />
                    <p>Posez une question pour lancer la recherche dans vos documents.</p>
                  </div>
              )}

              {messages.map((msg, index) => {
                const isUser = msg.sender === 'USER';
                return (
                    <div
                        key={msg.id || index}
                        style={{
                          display: 'flex',
                          flexDirection: isUser ? 'row-reverse' : 'row',
                          gap: '12px',
                          alignSelf: isUser ? 'flex-end' : 'flex-start',
                          maxWidth: '80%'
                        }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isUser ? '#0284c7' : '#059669',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isUser ? <User size={16} /> : <Bot size={16} />}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          backgroundColor: isUser ? '#0284c7' : '#f1f5f9',
                          color: isUser ? 'white' : '#0f172a',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {msg.content}
                        </div>

                        {!isUser && msg.sources && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                              {msg.sources.map((source, i) => (
                                  <button
                                      key={i}
                                      onClick={() => setSelectedSource(source)}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: selectedSource === source ? '1px solid #0284c7' : '1px solid #cbd5e1',
                                        backgroundColor: selectedSource === source ? '#e0f2fe' : '#ffffff',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        color: '#334155'
                                      }}
                                  >
                                    📄 {source.fileName} (Page {source.pageNumber})
                                  </button>
                              ))}
                            </div>
                        )}
                      </div>
                    </div>
                );
              })}

              {loading && (
                  <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bot size={16} />
                    </div>
                    <div style={{ padding: '12px 16px', backgroundColor: '#f0f9ff', borderLeft: '4px solid #0284c7', borderRadius: '4px', color: '#0284c7', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>L'assistant analyse les documents</span>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                    </div>
                  </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Zone de Saisie */}
            <form onSubmit={handleSearch} style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
              <input
                  type="text"
                  placeholder={activeRoomId ? "Posez une question dans cette discussion..." : "Sélectionnez une discussion d'abord"}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={loading || !activeRoomId}
                  style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
              <button
                  type="submit"
                  disabled={loading || !question.trim() || !activeRoomId}
                  style={{
                    backgroundColor: loading || !question.trim() || !activeRoomId ? '#94a3b8' : '#0284c7',
                    color: 'white',
                    border: 'none',
                    padding: '0 20px',
                    borderRadius: '6px',
                    cursor: loading || !question.trim() || !activeRoomId ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
              >
                <Send size={16} /> Envoyer
              </button>
            </form>
          </div>

          {/* Colonne 3 : Viewer PDF */}
          <div style={{ width: '400px', backgroundColor: '#f8fafc', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>
              Aperçu de la source sélectionnée
            </h2>

            {selectedSource ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                  <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#0369a1' }}>
                      Extrait (Fichier: {selectedSource.fileName} - Page {selectedSource.pageNumber})
                    </h4>
                    <p style={{ fontSize: '12px', color: '#334155', fontStyle: 'italic', margin: 0, lineHeight: '1.4' }}>
                      "{selectedSource.extractedExcerpt || selectedSource.textContent}"
                    </p>
                  </div>

                  <div style={{ flex: 1, minHeight: '300px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                    <iframe
                        src={`${API_BASE_URL}/pdf/${selectedSource.fileName}#page=${selectedSource.pageNumber}`}
                        title="Aperçu PDF"
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                    />
                  </div>
                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
                  Cliquez sur une source sous la réponse de l'assistant pour afficher la page du PDF original.
                </div>
            )}
          </div>

        </div>

        {/* ================= MODALE: CRÉER UNE DISCUSSION ================= */}
        {isCreateModalOpen && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                width: '420px',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={20} color="#0284c7" />
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Nouvelle discussion</h3>
                  </div>
                  <button
                      onClick={() => setIsCreateModalOpen(false)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleConfirmCreateRoom}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '8px', fontWeight: '500' }}>
                    Titre de la conversation :
                  </label>
                  <input
                      type="text"
                      autoFocus
                      placeholder="Ex: Analyse contrat client..."
                      value={newRoomTitle}
                      onChange={(e) => setNewRoomTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        marginBottom: '20px'
                      }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: 'white',
                          color: '#475569',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                    >
                      Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={!newRoomTitle.trim()}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: !newRoomTitle.trim() ? '#94a3b8' : '#0284c7',
                          color: 'white',
                          cursor: !newRoomTitle.trim() ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          fontWeight: 'bold'
                        }}
                    >
                      Créer
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* ================= MODALE: SUPPRIMER UNE DISCUSSION ================= */}
        {roomToDelete && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                width: '420px',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#fef2f2',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Supprimer la discussion</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                      Cette action est irréversible.
                    </p>
                  </div>
                </div>

                <p style={{ fontSize: '14px', color: '#334155', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  Voulez-vous vraiment supprimer "<strong>{roomToDelete.title}</strong>" et tout son historique ?
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                      type="button"
                      onClick={() => setRoomToDelete(null)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: 'white',
                        color: '#475569',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                  >
                    Annuler
                  </button>
                  <button
                      type="button"
                      onClick={handleConfirmDeleteRoom}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
        )}

      </div>
  );
}