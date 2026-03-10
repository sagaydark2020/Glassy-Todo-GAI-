import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, CheckCircle2, Circle, LogOut, User as UserIcon, Loader2, Calendar, AlertCircle, ArrowUpDown, Lock } from 'lucide-react';
import { User, Todo } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate'>('createdAt');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('todo-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchTodos();
    }
  }, [user, sortBy]);

  const fetchTodos = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/todos?sortBy=${sortBy}`, {
        headers: { 'x-user-id': user.id.toString() }
      });
      const data = await res.json();
      setTodos(data);
    } catch (error) {
      console.error('Failed to fetch todos', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    const endpoint = isRegistering ? '/api/register' : '/api/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem('todo-user', JSON.stringify(data.user));
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (error) {
      setAuthError('Connection error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setTodos([]);
    localStorage.removeItem('todo-user');
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user) return;
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ text: newTodo, dueDate: dueDate || null })
      });
      const data = await res.json();
      setTodos([data, ...todos]);
      setNewTodo('');
      setDueDate('');
    } catch (error) {
      console.error('Failed to add todo', error);
    }
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    if (!user) return;
    try {
      await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ completed: !completed })
      });
      setTodos(todos.map(t => t.id === id ? { ...t, completed: !completed } : t));
    } catch (error) {
      console.error('Failed to toggle todo', error);
    }
  };

  const deleteTodo = async (id: number) => {
    if (!user) return;
    try {
      await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id.toString() }
      });
      setTodos(todos.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete todo', error);
    }
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date() && !todos.find(t => t.dueDate === dateStr)?.completed;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card w-full max-w-md text-center"
        >
          <div className="mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30">
              <CheckCircle2 className="text-white w-10 h-10" />
            </div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">GlassTodo</h1>
            <p className="text-slate-400">
              {isRegistering ? 'Create your account' : 'Welcome back'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Username"
                className="glass-input w-full pl-12"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input 
                type="password" 
                placeholder="Password"
                className="glass-input w-full pl-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {authError && (
              <p className="text-red-400 text-sm">{authError}</p>
            )}

            <button 
              type="submit" 
              className="glass-button w-full flex items-center justify-center gap-2"
              disabled={authLoading}
            >
              {authLoading ? <Loader2 className="animate-spin" /> : (isRegistering ? 'Register' : 'Login')}
            </button>
          </form>

          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setAuthError('');
            }}
            className="mt-6 text-slate-400 hover:text-white transition-colors text-sm"
          >
            {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">My Tasks</h1>
            <p className="text-slate-400">Welcome back, {user.username}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="glass-button-secondary flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Add Todo */}
        <form onSubmit={addTodo} className="glass-card p-4 mb-8 space-y-4">
          <div className="flex gap-3">
            <input 
              type="text" 
              placeholder="What needs to be done?"
              className="glass-input flex-1"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              required
            />
            <button type="submit" className="glass-button px-4 sm:px-6">
              <Plus className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="text-slate-500 w-5 h-5" />
            <input 
              type="date" 
              className="glass-input text-sm py-2"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <span className="text-xs text-slate-500">Optional due date</span>
          </div>
        </form>

        {/* Controls */}
        <div className="flex justify-end mb-4">
          <button 
            onClick={() => setSortBy(sortBy === 'createdAt' ? 'dueDate' : 'createdAt')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors glass px-4 py-2 rounded-xl"
          >
            <ArrowUpDown className="w-4 h-4" />
            Sort by: {sortBy === 'createdAt' ? 'Date Created' : 'Due Date'}
          </button>
        </div>

        {/* Todo List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {todos.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 glass-card border-dashed"
                >
                  <p className="text-slate-500">No tasks yet. Add one above!</p>
                </motion.div>
              ) : (
                todos.map((todo) => {
                  const overdue = isOverdue(todo.dueDate) && !todo.completed;
                  return (
                    <motion.div
                      key={todo.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`glass-card p-4 flex items-center gap-4 group ${todo.completed ? 'opacity-60' : ''}`}
                    >
                      <button 
                        onClick={() => toggleTodo(todo.id, todo.completed)}
                        className="text-indigo-500 hover:text-indigo-400 transition-colors"
                      >
                        {todo.completed ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <Circle className="w-6 h-6" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-lg truncate transition-all ${todo.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {todo.text}
                        </p>
                        {todo.dueDate && (
                          <div className={`flex items-center gap-1.5 mt-1 text-xs ${overdue ? 'text-red-400 font-medium' : 'text-slate-500'}`}>
                            <Calendar className="w-3 h-3" />
                            <span>Due: {new Date(todo.dueDate).toLocaleDateString()}</span>
                            {overdue && (
                              <span className="flex items-center gap-1 ml-2">
                                <AlertCircle className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => deleteTodo(todo.id)}
                        className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
