import React, { useState } from 'react';
import { MessageSquare, X, Send, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
import { FeatureBoard } from './FeatureBoard';
import { submitFeedback } from '../utils/feedbackApi';

export const Feedback = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<'feedback' | 'feature' | 'bug'>('feedback');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [email, setEmail] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        await submitFeedback(type, message, email);

        console.log({ type, message, email });

        setIsSubmitting(false);
        setShowSuccess(true);
        setMessage('');
        setEmail('');

        setTimeout(() => {
            setShowSuccess(false);
            setIsOpen(false);
        }, 2000);
    };

    return (
        <>
            {/* Floating Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`
                    fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-[60] 
                    flex items-center gap-2 px-4 py-3 
                    bg-indigo-600 hover:bg-indigo-700 active:scale-95
                    text-white font-medium rounded-full shadow-lg shadow-indigo-500/30
                    transition-all duration-300
                    ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
                `}
            >
                <MessageSquare size={20} />
                <span className="hidden sm:inline">Feedback</span>
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content */}
                    <div
                        className={`
                            relative w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-scale-in transition-all duration-300
                            ${type === 'feature' ? 'max-w-4xl h-[80vh]' : 'max-w-md'}
                        `}
                    >
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors z-20"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex bg-zinc-800/50 p-1 rounded-xl mb-6 relative z-10 w-fit">
                            {(['feedback', 'feature', 'bug'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`
                                        px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all
                                        ${type === t
                                            ? 'bg-zinc-700 text-white shadow-md'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                        }
                                    `}
                                >
                                    {t === 'feature' ? 'Roadmap' : t}
                                </button>
                            ))}
                        </div>

                        {type === 'feature' ? (
                            <FeatureBoard />
                        ) : !showSuccess ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white">
                                        {type === 'bug' ? 'Report a Bug' : 'Send Feedback'}
                                    </h3>
                                    <p className="text-sm text-zinc-400">
                                        {type === 'bug'
                                            ? 'Found an issue? Let us know so we can squash it!'
                                            : 'Tell us about your experience or suggest improvements.'
                                        }
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                                            Message
                                        </label>
                                        <textarea
                                            required
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder={
                                                type === 'bug' ? "Describe the bug and how to reproduce it..." :
                                                    "Tell us what you think..."
                                            }
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-32 text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                                            Email (Optional)
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="contact@example.com"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                                        />
                                    </div>
                                </div>

                                <Button
                                    isLoading={isSubmitting}
                                    type="submit"
                                    className="w-full"
                                >
                                    <Send size={16} className="mr-2" />
                                    Send
                                </Button>
                            </form>
                        ) : (
                            <div className="py-12 flex flex-col items-center text-center space-y-4 animate-fade-in">
                                <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-2">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Thank You!</h3>
                                <p className="text-zinc-400 max-w-[200px]">
                                    Your input has been received. We appreciate your help!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
