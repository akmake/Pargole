import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hammer, Plus, Layers, Trash2, ChevronLeft } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { formatCurrency } from '@/utils/pergolaPrice';

export default function HomePage() {
  const { projects, createProject, deleteProject } = useProjectStore();
  const navigate = useNavigate();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    document.title = 'הפרויקטים שלי | PergoCalc';
  }, []);

  const handleCreate = () => {
    const id = createProject(newName || 'פרויקט חדש');
    setNewName('');
    setCreating(false);
    navigate(`/project/${id}`);
  };

  const totalCostOf = (project) =>
    project.pergolas.reduce((s, g) => s + (g.pricing?.total || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <Hammer className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-extrabold text-gray-900">
              Pergo<span className="text-emerald-600">Calc</span>
            </span>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            פרויקט חדש
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-10">

        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">הפרויקטים שלי</h1>
        <p className="text-sm text-gray-400 mb-8">כל פרויקט מכיל פרגולות, רשימת חיתוך ותמחור</p>

        {/* ── Inline creation form ─────────────────────────────────────── */}
        {creating && (
          <div className="bg-white rounded-2xl border border-emerald-200 p-5 mb-6 shadow-sm">
            <p className="text-sm font-bold text-gray-900 mb-3">שם הפרויקט</p>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="למשל: בית לקוח רחוב הרצל"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setCreating(false);
                }}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={handleCreate}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                צור
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {projects.length === 0 && !creating && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-gray-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">אין פרויקטים עדיין</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
              צור פרויקט, הוסף פרגולות – וקבל הזמנת חומר מאוחדת לכל הפרויקט.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              צור פרויקט ראשון
            </button>
          </div>
        )}

        {/* ── Project cards grid ───────────────────────────────────────── */}
        {projects.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {projects.map((project) => {
              const total = totalCostOf(project);
              const date = new Date(project.createdAt).toLocaleDateString('he-IL', {
                day: '2-digit', month: '2-digit', year: '2-digit',
              });

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-bold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                        {project.name}
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">{date}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`למחוק את "${project.name}"?`)) {
                          deleteProject(project.id);
                        }
                      }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all shrink-0"
                      aria-label="מחק פרויקט"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 rounded-xl px-3 py-2 text-center">
                      <p className="text-[10px] text-emerald-600 font-semibold">פרגולות</p>
                      <p className="text-lg font-black text-emerald-700">{project.pergolas.length}</p>
                    </div>
                    {total > 0 && (
                      <div className="bg-gray-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-gray-500 font-semibold">עלות כוללת</p>
                        <p className="text-sm font-black text-gray-800">{formatCurrency(total)}</p>
                      </div>
                    )}
                    <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 transition-colors mr-auto" />
                  </div>
                </div>
              );
            })}

            {/* "New project" card */}
            <button
              onClick={() => setCreating(true)}
              className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-emerald-600 min-h-[120px]"
            >
              <Plus className="w-6 h-6" />
              <span className="text-sm font-semibold">פרויקט חדש</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
