import React, { useState, useEffect } from 'react';
import { ThumbsUp, Plus, CheckCircle2, Clock, Loader2, Flame } from 'lucide-react';
import { Button } from './ui/Button';
import { fetchFeatures, submitFeature, voteFeature } from '../utils/feedbackApi';

// Minimum votes required before a requested feature is considered for implementation
const VOTE_THRESHOLD = 10;

type FeatureStatus = 'requested' | 'in-progress' | 'completed';

interface Feature {
    id: string;
    title: string;
    description: string;
    status: FeatureStatus;
    votes: number;
    hasVoted?: boolean;
    date: string;
}

const DEFAULT_COMMUNITY_FEATURES: Feature[] = [
    {
        id: 'feat-audio-extractor',
        title: 'Audio Extractor (Video to MP3)',
        description: 'Extract audio tracks, speech, and sound effects from any video file with custom bitrates.',
        status: 'completed',
        votes: 89,
        date: '2026-03-01'
    },
    {
        id: 'feat-palette-extractor',
        title: 'Image Color Palette Extractor',
        description: 'Drop any photo to extract dominant color palettes, HEX swatches, and CSS variables.',
        status: 'completed',
        votes: 74,
        date: '2026-03-02'
    },
    {
        id: 'feat-exif-stripper',
        title: 'EXIF Metadata Stripper & Inspector',
        description: 'View and strip hidden GPS coordinates, camera specs, and device metadata from photos before sharing.',
        status: 'completed',
        votes: 63,
        date: '2026-03-05'
    },
    {
        id: 'feat-pdf-watermark',
        title: 'PDF Watermark & Page Numberer',
        description: 'Stamp diagonal confidential watermarks or add customized page numbering to PDF pages.',
        status: 'completed',
        votes: 52,
        date: '2026-03-08'
    },
    {
        id: 'feat-video-speed',
        title: 'Video Speed & Slo-Mo Controller',
        description: 'Speed up or slow down videos (0.25x to 8x) with pitch-corrected audio for reels and TikTok.',
        status: 'in-progress',
        votes: 41,
        date: '2026-03-10'
    }
];

export const FeatureBoard = () => {
    const [features, setFeatures] = useState<Feature[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newFeature, setNewFeature] = useState({ title: '', description: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load from API or Fallback to curated roadmap
    useEffect(() => {
        const loadFeatures = async () => {
            setIsLoading(true);
            const apiData = await fetchFeatures();

            // Merge with local voted state
            const votedIds = JSON.parse(localStorage.getItem('omni_voted_features') || '[]');
            const localCustom: Feature[] = JSON.parse(localStorage.getItem('omni_custom_features') || '[]');

            const normalizeStatus = (s: string): FeatureStatus => {
                const lower = (s || 'requested').toLowerCase().trim();
                if (lower === 'completed' || lower === 'done') return 'completed';
                if (lower === 'in-progress' || lower === 'in progress') return 'in-progress';
                return 'requested';
            };

            const baseList = (apiData && apiData.length > 0) ? apiData : [...localCustom, ...DEFAULT_COMMUNITY_FEATURES];

            const merged = baseList.map((f: any) => ({
                ...f,
                status: normalizeStatus(f.status),
                hasVoted: votedIds.includes(f.id)
            }));
            // Sort by votes desc
            setFeatures(merged.sort((a: Feature, b: Feature) => b.votes - a.votes));
            setIsLoading(false);
        };
        loadFeatures();
    }, []);

    const handleVote = async (id: string) => {
        // Optimistic update
        const featureIndex = features.findIndex(f => f.id === id);
        if (featureIndex === -1) return;

        const feature = features[featureIndex];
        const newHasVoted = !feature.hasVoted;
        const delta = newHasVoted ? 1 : -1;

        const updatedFeatures = [...features];
        updatedFeatures[featureIndex] = {
            ...feature,
            votes: feature.votes + delta,
            hasVoted: newHasVoted
        };

        setFeatures(updatedFeatures);

        // Update local storage for persistence of "hasVoted"
        const votedIds = JSON.parse(localStorage.getItem('omni_voted_features') || '[]');
        if (newHasVoted) {
            localStorage.setItem('omni_voted_features', JSON.stringify([...votedIds, id]));
        } else {
            localStorage.setItem('omni_voted_features', JSON.stringify(votedIds.filter((v: string) => v !== id)));
        }

        // Send to API
        await voteFeature(id, delta);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Optimistic Add
        const tempId = Date.now().toString();
        const optimisticFeature: Feature = {
            id: tempId,
            title: newFeature.title,
            description: newFeature.description,
            status: 'requested',
            votes: 1,
            hasVoted: true,
            date: new Date().toISOString()
        };

        setFeatures([optimisticFeature, ...features]);
        setShowAddForm(false);
        setNewFeature({ title: '', description: '' });

        // Persist locally
        const localCustom: Feature[] = JSON.parse(localStorage.getItem('omni_custom_features') || '[]');
        localStorage.setItem('omni_custom_features', JSON.stringify([optimisticFeature, ...localCustom]));

        // API Call
        const result = await submitFeature(optimisticFeature.title, optimisticFeature.description);

        // Update ID if success
        if (result.status === 'success' && result.id) {
            setFeatures(prev => prev.map(f => f.id === tempId ? { ...f, id: result.id! } : f));
            // Also add ID to local voted
            const votedIds = JSON.parse(localStorage.getItem('omni_voted_features') || '[]');
            localStorage.setItem('omni_voted_features', JSON.stringify([...votedIds, result.id]));
        }

        setIsSubmitting(false);
    };

    const getStatusIcon = (status: FeatureStatus) => {
        switch (status) {
            case 'completed': return <CheckCircle2 size={14} className="text-green-500" />;
            case 'in-progress': return <Loader2 size={14} className="text-indigo-500 animate-spin-slow" />;
            case 'requested': return <Clock size={14} className="text-zinc-500" />;
        }
    };

    const getStatusColor = (status: FeatureStatus) => {
        switch (status) {
            case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'in-progress': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
            case 'requested': return 'bg-zinc-800 text-zinc-400 border-zinc-700';
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-full text-zinc-500 gap-2">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
                <p className="text-xs font-mono">Syncing roadmap...</p>
            </div>
        );
    }

    if (showAddForm) {
        return (
            <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Suggest a Feature</h3>
                    <button
                        onClick={() => setShowAddForm(false)}
                        className="text-xs text-zinc-400 hover:text-white"
                    >
                        Cancel
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Title</label>
                        <input
                            required
                            value={newFeature.title}
                            onChange={e => setNewFeature({ ...newFeature, title: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g., AI Background Generator"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Description</label>
                        <textarea
                            required
                            value={newFeature.description}
                            onChange={e => setNewFeature({ ...newFeature, description: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                            placeholder="Describe how it should work..."
                        />
                    </div>
                    <Button type="submit" className="w-full">Submit Request</Button>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-end shrink-0">
                <Button size="sm" onClick={() => setShowAddForm(true)}>
                    <Plus size={16} className="mr-2" /> New Request
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[300px]">
                {/* Organize by status priority: In Progress -> Requested -> Completed */}
                {['requested', 'in-progress', 'completed'].map(statusGroup => {
                    const groupFeatures = features.filter(f => f.status === statusGroup);

                    return (
                        <div key={statusGroup} className="flex flex-col gap-3 min-w-0">
                            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider sticky top-0 bg-zinc-900 py-1 z-10 flex items-center gap-2">
                                {getStatusIcon(statusGroup as FeatureStatus)}
                                {statusGroup.replace('-', ' ')}
                                {statusGroup === 'requested' && (
                                    <span className="ml-auto text-[10px] font-normal text-zinc-600 normal-case tracking-normal">
                                        {VOTE_THRESHOLD} votes to proceed
                                    </span>
                                )}
                            </div>
                            {groupFeatures.length === 0 && (
                                <div className="text-center text-zinc-600 text-xs py-6 border border-dashed border-zinc-800 rounded-xl">
                                    No features yet
                                </div>
                            )}
                            {groupFeatures.map(feature => {
                                const isRequested = feature.status === 'requested';
                                const pct = isRequested ? Math.min((feature.votes / VOTE_THRESHOLD) * 100, 100) : 0;
                                const reached = isRequested && feature.votes >= VOTE_THRESHOLD;
                                const remaining = Math.max(VOTE_THRESHOLD - feature.votes, 0);

                                return (
                                    <div
                                        key={feature.id}
                                        className={`border rounded-xl p-4 transition-colors group ${reached
                                            ? 'bg-indigo-500/10 border-indigo-500/40 hover:bg-indigo-500/15'
                                            : 'bg-zinc-800/50 hover:bg-zinc-800 border-zinc-700/50'
                                        }`}
                                    >
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleVote(feature.id)}
                                                className={`flex flex-col items-center justify-center p-2 rounded-lg h-fit transition-colors flex-shrink-0 ${feature.hasVoted
                                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                    : 'bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                                                    }`}
                                            >
                                                <ThumbsUp size={16} className={feature.hasVoted ? 'fill-current' : ''} />
                                                <span className="text-xs font-bold mt-1">{feature.votes}</span>
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-semibold text-zinc-200 text-sm truncate">{feature.title}</h4>
                                                    {reached && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wide">
                                                            <Flame size={9} /> Hot
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{feature.description}</p>

                                                {/* Threshold progress — requested only */}
                                                {isRequested && (
                                                    <div className="mt-3 space-y-1">
                                                        <div className="h-1 w-full bg-zinc-700/60 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${reached ? 'bg-indigo-400' : 'bg-zinc-500'}`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <p className="text-[10px] text-zinc-600 font-mono">
                                                            {reached
                                                                ? `${feature.votes} votes — eligible for implementation`
                                                                : `${feature.votes}/${VOTE_THRESHOLD} votes needed`
                                                            }
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
