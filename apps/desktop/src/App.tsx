import {
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
    type ReactElement,
} from "react";

import { getPageHash, navigationItems, type PageId } from "./app/navigation";
import { usePageRouter } from "./app/usePageRouter";
import {
    exportLearningBackup,
    importContentPackageFile,
    importLearningBackup,
    loadLearningWorkspace,
    reviewVocabularyEntry,
    saveUserSettings,
    selectContentPack,
    submitClozeAnswer,
} from "./storage/repository";
import type { ReviewRating } from "@bestlng/core";
import type {
    AnswerStrictness,
    LearningWorkspaceState,
    SubmitClozeAnswerResult,
    UserSettings,
    ContentPackView,
    VocabularyEntryView,
} from "./storage/types";
import "./styles.css";

type Metric = {
    label: string;
    tone: "blue" | "green" | "amber";
    value: string;
};

type PageSummary = {
    actionLabel: string;
    description: string;
    eyebrow: string;
    metrics: Metric[];
    title: string;
};

const loadingSummary: PageSummary = {
    actionLabel: "加载中",
    description: "正在整理今天要学习的词书和句子。",
    eyebrow: "BestLNG",
    metrics: [
        { label: "今日目标", tone: "green", value: "-" },
        { label: "待复习", tone: "amber", value: "-" },
        { label: "连续学习", tone: "blue", value: "-" },
    ],
    title: "安静地学一组词",
};

function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

function formatDateLabel(value: string): string {
    const date = new Date(value);
    const today = new Date();

    if (Number.isNaN(date.getTime())) {
        return "待安排";
    }

    if (date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)) {
        return "今天";
    }

    return date.toLocaleDateString("zh-CN", {
        month: "numeric",
        day: "numeric",
    });
}

function getStrictnessLabel(strictness: AnswerStrictness): string {
    if (strictness === "relaxed") {
        return "宽松";
    }

    if (strictness === "strict") {
        return "严格";
    }

    return "标准";
}

function getStatusLabel(status: VocabularyEntryView["status"]): string {
    if (status === "needs_review") {
        return "需巩固";
    }

    if (status === "mastered") {
        return "已掌握";
    }

    return "学习中";
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string" && error.length > 0) {
        return error;
    }

    return fallbackMessage;
}

function getActiveContentPack(state: LearningWorkspaceState): ContentPackView | null {
    return state.contentPacks.find((pack) => pack.id === state.activeContentPackId) ?? null;
}

function getPackDisplayName(pack: ContentPackView): string {
    return pack.title
        .replace("BestLNG ", "")
        .replace("英中挖空词包", "")
        .replace("英中内容包", "")
        .trim();
}

function getPackShortDescription(pack: ContentPackView): string {
    const title = pack.title.toLowerCase();

    if (title.includes("cet4")) {
        return "四级备考词书，适合从基础高频词开始稳步推进。";
    }

    if (title.includes("cet6")) {
        return "六级备考词书，覆盖阅读和写作里更常见的进阶词。";
    }

    if (title.includes("ielts")) {
        return "雅思词书，偏学术阅读和表达场景。";
    }

    if (title.includes("toefl")) {
        return "托福词书，偏校园、学术和综合阅读场景。";
    }

    return pack.description || "轻量入门词书，适合快速熟悉练习方式。";
}

function getPackCategory(pack: ContentPackView): string {
    const title = pack.title.toLowerCase();

    if (title.includes("cet4")) {
        return "CET-4";
    }

    if (title.includes("cet6")) {
        return "CET-6";
    }

    if (title.includes("ielts")) {
        return "IELTS";
    }

    if (title.includes("toefl")) {
        return "TOEFL";
    }

    return "入门";
}

function buildPageSummaries(state: LearningWorkspaceState | null): Record<PageId, PageSummary> {
    if (state === null) {
        return {
            cloze: loadingSummary,
            packs: loadingSummary,
            settings: loadingSummary,
            stats: loadingSummary,
            today: loadingSummary,
            vocabulary: loadingSummary,
        };
    }

    const activePack = getActiveContentPack(state);
    const activePackTitle = activePack === null ? "未选择词书" : getPackDisplayName(activePack);

    return {
        today: {
            actionLabel: "开始练习",
            description: `今天先从「${activePackTitle}」里读一组句子，遇到不稳的词再回到复习队列。`,
            eyebrow: "今日",
            metrics: [
                { label: "今日目标", tone: "green", value: `${state.settings.dailyTarget} 题` },
                { label: "待复习", tone: "amber", value: `${state.dueVocabularyCount} 个` },
                { label: "连续学习", tone: "blue", value: `${state.streakDays} 天` },
            ],
            title: "今日练习",
        },
        cloze: {
            actionLabel: "检查答案",
            description: `当前词书：${activePackTitle}。读完整句，根据语境和释义补上缺失词。`,
            eyebrow: "练习",
            metrics: [
                { label: "可练句子", tone: "blue", value: `${state.totalSentences} 句` },
                { label: "累计正确率", tone: "green", value: formatPercent(state.correctRate) },
                {
                    label: "答案模式",
                    tone: "amber",
                    value: getStrictnessLabel(state.settings.strictness),
                },
            ],
            title: "句子填空",
        },
        vocabulary: {
            actionLabel: "查看复习",
            description: `这里只看「${activePackTitle}」里的词，按学习顺序和复习状态整理。`,
            eyebrow: "词本",
            metrics: [
                { label: "收录词条", tone: "blue", value: `${state.vocabulary.length}` },
                { label: "需巩固", tone: "amber", value: `${state.dueVocabularyCount}` },
                {
                    label: "已掌握",
                    tone: "green",
                    value: `${state.vocabulary.filter((entry) => entry.status === "mastered").length}`,
                },
            ],
            title: "单词本",
        },
        packs: {
            actionLabel: "选择词书",
            description: "像选一本书一样选择今天要学的内容，练习和单词本会跟着切换。",
            eyebrow: "书架",
            metrics: [
                {
                    label: "已启用",
                    tone: "green",
                    value: `${state.contentPacks.filter((pack) => pack.isEnabled).length} 本`,
                },
                { label: "可用句子", tone: "blue", value: `${state.totalSentences} 句` },
                { label: "当前词书", tone: "amber", value: activePackTitle },
            ],
            title: "词书",
        },
        stats: {
            actionLabel: "查看周报",
            description: `回看「${activePackTitle}」这一周的练习节奏和薄弱词。`,
            eyebrow: "回看",
            metrics: [
                { label: "今日练习", tone: "blue", value: `${state.todayAttemptCount} 题` },
                { label: "平均正确率", tone: "green", value: formatPercent(state.correctRate) },
                { label: "薄弱词", tone: "amber", value: `${state.weakWords.length} 个` },
            ],
            title: "统计",
        },
        settings: {
            actionLabel: "保存设置",
            description: "调整每日目标、判题方式和数据备份。",
            eyebrow: "偏好",
            metrics: [
                { label: "每日目标", tone: "green", value: `${state.settings.dailyTarget} 题` },
                {
                    label: "答案模式",
                    tone: "blue",
                    value: getStrictnessLabel(state.settings.strictness),
                },
                {
                    label: "错词复习",
                    tone: "amber",
                    value: state.settings.autoAddWrongAnswers ? "开启" : "关闭",
                },
            ],
            title: "设置",
        },
    };
}

function App(): ReactElement {
    const [activePageId, navigate] = usePageRouter();
    const [workspaceState, setWorkspaceState] = useState<LearningWorkspaceState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [announcement, setAnnouncement] = useState("BestLNG 已启动。");
    const summaries = useMemo(() => buildPageSummaries(workspaceState), [workspaceState]);
    const activeSummary = summaries[activePageId];

    useEffect(() => {
        let isMounted = true;

        async function loadInitialState(): Promise<void> {
            try {
                const state = await loadLearningWorkspace();

                if (!isMounted) {
                    return;
                }

                setWorkspaceState(state);
                setAnnouncement(state.isPersistent ? "学习数据已准备好。" : "预览数据已准备好。");
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setErrorMessage(getErrorMessage(error, "加载本地数据失败。"));
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadInitialState();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        document.title = `${activeSummary.title} | BestLNG`;
    }, [activeSummary.title]);

    const handlePrimaryAction = (): void => {
        if (activePageId === "today" || activePageId === "stats" || activePageId === "vocabulary") {
            navigate("cloze");
            return;
        }

        if (activePageId === "packs") {
            navigate("settings");
        }
    };

    return (
        <div className="app-shell">
            <a className="skip-link" href="#main-content">
                跳到主要内容
            </a>
            <aside className="sidebar" aria-label="BestLNG 桌面端导航">
                <div className="brand-block">
                    <span className="brand-mark" aria-hidden="true">
                        B
                    </span>
                    <div>
                        <strong>BestLNG</strong>
                        <span>句子里记单词</span>
                    </div>
                </div>

                <nav className="workspace-nav" aria-label="基础页面">
                    {navigationItems.map((item) => {
                        const isActive = item.id === activePageId;

                        return (
                            <a
                                aria-current={isActive ? "page" : undefined}
                                className="nav-button"
                                href={getPageHash(item.id)}
                                key={item.id}
                                onClick={(event) => {
                                    event.preventDefault();
                                    navigate(item.id);
                                }}
                            >
                                <span className="nav-button__label">{item.label}</span>
                                <span className="nav-button__description">{item.description}</span>
                            </a>
                        );
                    })}
                </nav>

                <section className="local-status" aria-label="学习状态">
                    <span className="status-dot" aria-hidden="true" />
                    <div>
                        <strong>
                            {workspaceState?.isPersistent === false ? "预览模式" : "已准备好"}
                        </strong>
                        <p>
                            {workspaceState?.isPersistent === false
                                ? "当前只是临时预览，适合快速看界面。"
                                : "你的练习记录会保存在这台电脑上。"}
                        </p>
                    </div>
                </section>
            </aside>

            <main className="workspace" id="main-content" aria-labelledby="workspace-title">
                <p className="sr-only" role="status" aria-live="polite">
                    {announcement}
                </p>

                <header className="workspace-header">
                    <div className="workspace-header__copy">
                        <p className="section-eyebrow">{activeSummary.eyebrow}</p>
                        <h1 id="workspace-title">{activeSummary.title}</h1>
                        <p>{activeSummary.description}</p>
                    </div>

                    <div className="workspace-header__actions" aria-label="当前页面操作">
                        <button
                            className="ghost-button"
                            disabled={isLoading}
                            onClick={() => {
                                navigate("today");
                            }}
                            type="button"
                        >
                            今日概览
                        </button>
                        <button
                            className="primary-button"
                            disabled={isLoading || activePageId === "settings"}
                            onClick={handlePrimaryAction}
                            type="button"
                        >
                            {activeSummary.actionLabel}
                        </button>
                    </div>
                </header>

                {errorMessage === null ? null : (
                    <div className="status-banner status-banner--error" role="alert">
                        {errorMessage}
                    </div>
                )}

                <section className="metric-grid" aria-label={`${activeSummary.title}概览`}>
                    {activeSummary.metrics.map((metric) => (
                        <article
                            className={`metric-card metric-card--${metric.tone}`}
                            key={metric.label}
                        >
                            <span>{metric.label}</span>
                            <strong>{metric.value}</strong>
                        </article>
                    ))}
                </section>

                <PageContent
                    activePageId={activePageId}
                    isLoading={isLoading}
                    onAnnouncement={setAnnouncement}
                    onNavigate={navigate}
                    onStateChange={setWorkspaceState}
                    state={workspaceState}
                />
            </main>
        </div>
    );
}

function PageContent({
    activePageId,
    isLoading,
    onAnnouncement,
    onNavigate,
    onStateChange,
    state,
}: {
    activePageId: PageId;
    isLoading: boolean;
    onAnnouncement: (message: string) => void;
    onNavigate: (pageId: PageId) => void;
    onStateChange: (state: LearningWorkspaceState) => void;
    state: LearningWorkspaceState | null;
}): ReactElement {
    if (isLoading || state === null) {
        return (
            <section className="panel empty-state" aria-live="polite">
                <p className="section-eyebrow">准备中</p>
                <h2>正在整理今天的练习</h2>
                <p>稍等一下，词书和复习队列马上就好。</p>
            </section>
        );
    }

    switch (activePageId) {
        case "today":
            return <TodayPanel onNavigate={onNavigate} state={state} />;
        case "cloze":
            return (
                <ClozePanel
                    onAnnouncement={onAnnouncement}
                    onStateChange={onStateChange}
                    state={state}
                />
            );
        case "vocabulary":
            return (
                <VocabularyPanel
                    activePackTitle={
                        getActiveContentPack(state) === null
                            ? "未选择词书"
                            : getPackDisplayName(getActiveContentPack(state)!)
                    }
                    onAnnouncement={onAnnouncement}
                    onStateChange={onStateChange}
                    vocabulary={state.vocabulary}
                />
            );
        case "packs":
            return (
                <PacksPanel
                    onAnnouncement={onAnnouncement}
                    onStateChange={onStateChange}
                    state={state}
                />
            );
        case "stats":
            return <StatsPanel state={state} />;
        case "settings":
            return (
                <SettingsPanel
                    onAnnouncement={onAnnouncement}
                    onStateChange={onStateChange}
                    state={state}
                />
            );
    }
}

function TodayPanel({
    onNavigate,
    state,
}: {
    onNavigate: (pageId: PageId) => void;
    state: LearningWorkspaceState;
}): ReactElement {
    const progress = Math.min(
        100,
        Math.round((state.todayAttemptCount / state.settings.dailyTarget) * 100),
    );
    const dueVocabulary = state.vocabulary.filter(
        (entry) => new Date(entry.nextReviewAt) <= new Date(),
    );
    const activePack = getActiveContentPack(state);

    return (
        <div className="content-grid content-grid--wide">
            <section className="panel panel--primary" aria-labelledby="today-plan-title">
                <div className="panel-heading">
                    <div>
                        <p className="section-eyebrow">Plan</p>
                        <h2 id="today-plan-title">今日任务流</h2>
                        <p className="panel-subtitle">
                            {activePack === null
                                ? "先到词书页选择一本词书。"
                                : `当前词书：${getPackDisplayName(activePack)}`}
                        </p>
                    </div>
                    <span className="compact-badge">{progress >= 100 ? "已完成" : "进行中"}</span>
                </div>

                <div className="progress-block" aria-label="今日练习进度">
                    <div className="progress-block__copy">
                        <span>目标进度</span>
                        <strong>
                            {state.todayAttemptCount} / {state.settings.dailyTarget}
                        </strong>
                    </div>
                    <div className="progress-track" aria-hidden="true">
                        <span style={{ width: `${progress}%` }} />
                    </div>
                </div>

                <ol className="task-list">
                    <li>
                        <strong>读一句</strong>
                        <span>先把英文句子读完整，再根据语境判断缺失词。</span>
                    </li>
                    <li>
                        <strong>补一个词</strong>
                        <span>输入答案后再看正确词和解释，避免提前泄题。</span>
                    </li>
                    <li>
                        <strong>回看薄弱项</strong>
                        <span>把还不稳的词放进复习节奏里，下一次再遇见。</span>
                    </li>
                </ol>

                <button
                    className="primary-button panel-action"
                    onClick={() => {
                        onNavigate("cloze");
                    }}
                    type="button"
                >
                    进入句子填空
                </button>
            </section>

            <section className="panel" aria-labelledby="review-queue-title">
                <div className="panel-heading">
                    <div>
                        <p className="section-eyebrow">Queue</p>
                        <h2 id="review-queue-title">复习队列</h2>
                    </div>
                </div>

                <div className="review-stack">
                    {dueVocabulary.slice(0, 4).map((entry) => (
                        <article key={entry.id}>
                            <span>{formatDateLabel(entry.nextReviewAt)}</span>
                            <strong>{entry.term}</strong>
                            <p>{entry.meaning}</p>
                        </article>
                    ))}
                    {dueVocabulary.length === 0 ? (
                        <div className="empty-state empty-state--compact">今天暂无到期复习。</div>
                    ) : null}
                </div>
            </section>
        </div>
    );
}

function ClozePanel({
    onAnnouncement,
    onStateChange,
    state,
}: {
    onAnnouncement: (message: string) => void;
    onStateChange: (state: LearningWorkspaceState) => void;
    state: LearningWorkspaceState;
}): ReactElement {
    const exercise = state.activeExercise;
    const activePack = getActiveContentPack(state);
    const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState<SubmitClozeAnswerResult | null>(null);
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        setSubmittedAnswers({});
        setFeedback(null);
    }, [exercise?.id]);

    if (exercise === null) {
        return (
            <section className="panel empty-state">
                <p className="section-eyebrow">Prompt</p>
                <h2>暂无可练习句子</h2>
                <p>到词书页选择一本有句子的词书后，这里会显示下一道填空题。</p>
            </section>
        );
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        setIsChecking(true);

        try {
            const result = await submitClozeAnswer({
                exercise,
                submittedAnswers,
            });

            setFeedback(result);
            onStateChange(result.state);
            onAnnouncement(result.grade.isCorrect ? "回答正确。" : "回答错误，已记录到错题。");
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="content-grid content-grid--wide">
            <section className="panel panel--practice reading-panel" aria-labelledby="cloze-title">
                <div className="panel-heading">
                    <div>
                        <p className="section-eyebrow">阅读填空</p>
                        <h2 id="cloze-title">读完这句，再补上缺失词</h2>
                        <p className="panel-subtitle">
                            {activePack === null ? "未选择词书" : getPackDisplayName(activePack)}
                        </p>
                    </div>
                    <span className="compact-badge">
                        {getStrictnessLabel(state.settings.strictness)}
                    </span>
                </div>

                <div className="sentence-card reading-card" lang="en">
                    {renderClozeSentence(exercise.clozeSentence)}
                </div>

                <form className="cloze-form" onSubmit={handleSubmit}>
                    {exercise.blanks.map((blank, index) => (
                        <label
                            className="field-label"
                            htmlFor={`cloze-answer-${blank.id}`}
                            key={blank.id}
                        >
                            <span>你的答案</span>
                            <input
                                autoComplete="off"
                                id={`cloze-answer-${blank.id}`}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                    setSubmittedAnswers((current) => ({
                                        ...current,
                                        [blank.id]: event.target.value,
                                    }));
                                }}
                                placeholder={`请输入第 ${index + 1} 个缺失词`}
                                type="text"
                                value={submittedAnswers[blank.id] ?? ""}
                            />
                        </label>
                    ))}

                    <div className="answer-row">
                        <button className="primary-button" disabled={isChecking} type="submit">
                            {isChecking ? "检查中" : "检查答案"}
                        </button>
                    </div>
                </form>

                {feedback === null ? null : (
                    <div
                        className={`feedback-card ${
                            feedback.grade.isCorrect
                                ? "feedback-card--success"
                                : "feedback-card--error"
                        }`}
                        role="status"
                    >
                        <strong>{feedback.grade.isCorrect ? "回答正确" : "还差一点"}</strong>
                        <span>
                            标准答案：{feedback.expectedAnswer}。本题得分：
                            {feedback.grade.correctCount} / {feedback.grade.totalCount}
                        </span>
                        <small>{exercise.translation}</small>
                    </div>
                )}
            </section>

            <aside className="panel hint-panel" aria-labelledby="hint-title">
                <div className="panel-heading">
                    <div>
                        <p className="section-eyebrow">线索</p>
                        <h2 id="hint-title">先看这些就够了</h2>
                    </div>
                </div>

                <dl className="hint-list">
                    {exercise.blanks.map((blank) => (
                        <div key={blank.id}>
                            <dt>释义</dt>
                            <dd>{blank.hint ?? "结合英文语境判断。"}</dd>
                            <dt>长度</dt>
                            <dd>{blank.answer.length} 个字母</dd>
                        </div>
                    ))}
                    <div>
                        <dt>小提醒</dt>
                        <dd>做题前不会显示答案，提交后再给出目标词和完整提示。</dd>
                    </div>
                </dl>
            </aside>
        </div>
    );
}

function renderClozeSentence(sentence: string): ReactElement[] {
    const parts = sentence.split("____");
    const nodes: ReactElement[] = [];

    parts.forEach((part, index) => {
        nodes.push(<span key={`text-${index}`}>{part}</span>);

        if (index < parts.length - 1) {
            nodes.push(
                <span
                    className="blank-slot"
                    key={`blank-${index}`}
                    aria-label={`缺失词 ${index + 1}`}
                >
                    空位 {index + 1}
                </span>,
            );
        }
    });

    return nodes;
}

function VocabularyPanel({
    onAnnouncement,
    onStateChange,
    vocabulary,
    activePackTitle,
}: {
    onAnnouncement: (message: string) => void;
    onStateChange: (state: LearningWorkspaceState) => void;
    activePackTitle: string;
    vocabulary: readonly VocabularyEntryView[];
}): ReactElement {
    const [filter, setFilter] = useState<"all" | "due" | "mastered">("all");
    const [reviewingEntryId, setReviewingEntryId] = useState<string | null>(null);
    const [reviewMessage, setReviewMessage] = useState<string | null>(null);
    const now = new Date();
    const filteredVocabulary = vocabulary.filter((entry) => {
        if (filter === "due") {
            return new Date(entry.nextReviewAt) <= now;
        }

        if (filter === "mastered") {
            return entry.status === "mastered";
        }

        return true;
    });
    const handleReview = async (
        entry: VocabularyEntryView,
        rating: ReviewRating,
    ): Promise<void> => {
        setReviewingEntryId(entry.id);
        setReviewMessage(null);

        try {
            const result = await reviewVocabularyEntry(entry.id, rating);

            onStateChange(result.state);
            setReviewMessage(
                `${entry.term} 已安排到 ${formatDateLabel(result.nextReviewAt)} 复习。`,
            );
            onAnnouncement("复习结果已记录。");
        } catch (error) {
            const message = error instanceof Error ? error.message : "记录复习结果失败。";

            setReviewMessage(message);
            onAnnouncement(message);
        } finally {
            setReviewingEntryId(null);
        }
    };

    return (
        <section className="panel" aria-labelledby="vocabulary-title">
            <div className="panel-heading">
                <div>
                    <p className="section-eyebrow">词本</p>
                    <h2 id="vocabulary-title">词语清单</h2>
                    <p className="panel-subtitle">当前词本：{activePackTitle}</p>
                </div>
                <div className="segmented-control" aria-label="单词筛选">
                    <button
                        aria-current={filter === "all" ? "true" : undefined}
                        onClick={() => {
                            setFilter("all");
                        }}
                        type="button"
                    >
                        全部
                    </button>
                    <button
                        aria-current={filter === "due" ? "true" : undefined}
                        onClick={() => {
                            setFilter("due");
                        }}
                        type="button"
                    >
                        需复习
                    </button>
                    <button
                        aria-current={filter === "mastered" ? "true" : undefined}
                        onClick={() => {
                            setFilter("mastered");
                        }}
                        type="button"
                    >
                        已掌握
                    </button>
                </div>
            </div>

            {reviewMessage === null ? null : (
                <p className="form-note" role="status">
                    {reviewMessage}
                </p>
            )}

            <div className="word-list" role="list">
                {filteredVocabulary.map((entry) => (
                    <WordRow
                        entry={entry}
                        isReviewing={reviewingEntryId === entry.id}
                        key={entry.id}
                        onReview={handleReview}
                    />
                ))}
                {filteredVocabulary.length === 0 ? (
                    <div className="empty-state empty-state--compact">当前筛选下没有词条。</div>
                ) : null}
            </div>
        </section>
    );
}

function WordRow({
    entry,
    isReviewing,
    onReview,
}: {
    entry: VocabularyEntryView;
    isReviewing: boolean;
    onReview: (entry: VocabularyEntryView, rating: ReviewRating) => Promise<void>;
}): ReactElement {
    const isDue = new Date(entry.nextReviewAt) <= new Date();

    return (
        <article className="word-row" role="listitem">
            <div>
                <strong>{entry.term}</strong>
                <span>{entry.meaning}</span>
            </div>
            <span className="compact-badge">{getStatusLabel(entry.status)}</span>
            <span className="next-review">{formatDateLabel(entry.nextReviewAt)}</span>
            {isDue ? (
                <div className="review-actions" aria-label={`${entry.term} 复习评分`}>
                    {(
                        [
                            ["again", "再来"],
                            ["hard", "困难"],
                            ["good", "记住"],
                            ["easy", "简单"],
                        ] as const
                    ).map(([rating, label]) => (
                        <button
                            className="mini-button"
                            disabled={isReviewing}
                            key={rating}
                            onClick={() => {
                                void onReview(entry, rating);
                            }}
                            type="button"
                        >
                            {isReviewing ? "记录中" : label}
                        </button>
                    ))}
                </div>
            ) : null}
        </article>
    );
}

function PacksPanel({
    onAnnouncement,
    onStateChange,
    state,
}: {
    onAnnouncement: (message: string) => void;
    onStateChange: (state: LearningWorkspaceState) => void;
    state: LearningWorkspaceState;
}): ReactElement {
    const [isImporting, setIsImporting] = useState(false);
    const [selectingPackId, setSelectingPackId] = useState<string | null>(null);
    const [importMessage, setImportMessage] = useState<string | null>(null);
    const activePack = getActiveContentPack(state);

    const handleSelectPack = async (pack: ContentPackView): Promise<void> => {
        setSelectingPackId(pack.id);
        setImportMessage(null);

        try {
            const result = await selectContentPack(pack.id);

            onStateChange(result.state);
            setImportMessage(`已切换到「${pack.title}」。`);
            onAnnouncement(`已切换到${pack.title}。`);
        } catch (error) {
            const message = getErrorMessage(error, "切换词本失败。");

            setImportMessage(message);
            onAnnouncement(message);
        } finally {
            setSelectingPackId(null);
        }
    };

    const handleImport = async (): Promise<void> => {
        setIsImporting(true);
        setImportMessage(null);

        try {
            const result = await importContentPackageFile();

            if (result === null) {
                setImportMessage("已取消导入。");
                return;
            }

            onStateChange(result.state);
            setImportMessage(
                `已导入「${result.packageName}」，新增 ${result.importedSentenceCount} 句。`,
            );
            onAnnouncement("词书已导入。");
        } catch (error) {
            const message = error instanceof Error ? error.message : "导入词书失败。";

            setImportMessage(message);
            onAnnouncement(message);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="content-grid">
            <section className="panel shelf-panel" aria-labelledby="packs-title">
                <div className="panel-heading">
                    <div>
                        <p className="section-eyebrow">词书</p>
                        <h2 id="packs-title">选择一本开始学</h2>
                        <p className="panel-subtitle">
                            当前学习：
                            {activePack === null ? "未选择词书" : getPackDisplayName(activePack)}
                        </p>
                    </div>
                </div>

                <div className="pack-list">
                    {state.contentPacks.map((pack) => (
                        <article
                            className={`pack-card ${
                                pack.id === state.activeContentPackId ? "pack-card--active" : ""
                            }`}
                            key={pack.id}
                        >
                            <div className="pack-card__cover" aria-hidden="true">
                                {getPackCategory(pack)}
                            </div>
                            <div className="pack-card__copy">
                                <span>{getPackCategory(pack)}</span>
                                <strong>{getPackDisplayName(pack)}</strong>
                                <p>{getPackShortDescription(pack)}</p>
                            </div>
                            <dl>
                                <div>
                                    <dt>状态</dt>
                                    <dd>
                                        {pack.id === state.activeContentPackId
                                            ? "当前词书"
                                            : "未选择"}
                                    </dd>
                                </div>
                                <div>
                                    <dt>句子</dt>
                                    <dd>{pack.sentenceCount.toLocaleString("zh-CN")} 句</dd>
                                </div>
                                <div>
                                    <dt>状态</dt>
                                    <dd>{pack.isEnabled ? "已启用" : "暂停"}</dd>
                                </div>
                            </dl>
                            <button
                                className={
                                    pack.id === state.activeContentPackId
                                        ? "secondary-button"
                                        : "primary-button"
                                }
                                disabled={
                                    !pack.isEnabled ||
                                    selectingPackId !== null ||
                                    pack.id === state.activeContentPackId
                                }
                                onClick={() => {
                                    void handleSelectPack(pack);
                                }}
                                type="button"
                            >
                                {selectingPackId === pack.id
                                    ? "切换中"
                                    : pack.id === state.activeContentPackId
                                      ? "正在学习"
                                      : "开始学习"}
                            </button>
                        </article>
                    ))}
                </div>
            </section>

            <aside className="panel import-panel" aria-labelledby="import-title">
                <p className="section-eyebrow">导入</p>
                <h2 id="import-title">添加自己的词书</h2>
                <p>可以把自己整理的句子和答案导入成一本文本词书。</p>
                <button
                    className="secondary-button"
                    disabled={!state.isPersistent || isImporting}
                    onClick={() => {
                        void handleImport();
                    }}
                    type="button"
                >
                    {isImporting ? "导入中" : "选择本地文件"}
                </button>
                {importMessage === null ? null : (
                    <p className="form-note" role="status">
                        {importMessage}
                    </p>
                )}
            </aside>
        </div>
    );
}

function StatsPanel({ state }: { state: LearningWorkspaceState }): ReactElement {
    const maxValue = Math.max(1, ...state.weeklyPractice.map((point) => point.value));
    const activePack = getActiveContentPack(state);

    return (
        <div className="content-grid content-grid--wide">
            <section className="panel" aria-labelledby="stats-title">
                <div className="panel-heading">
                    <div>
                        <p className="section-eyebrow">本周</p>
                        <h2 id="stats-title">本周练习量</h2>
                        <p className="panel-subtitle">
                            {activePack === null ? "未选择词书" : getPackDisplayName(activePack)}
                        </p>
                    </div>
                </div>

                <div className="bar-chart" aria-label="最近七天练习数量">
                    {state.weeklyPractice.map((point, index) => (
                        <ChartBar
                            day={point.day}
                            height={`${Math.max(8, Math.round((point.value / maxValue) * 100))}%`}
                            key={`${point.day}-${index}`}
                            value={String(point.value)}
                        />
                    ))}
                </div>
            </section>

            <aside className="panel" aria-labelledby="weak-words-title">
                <div className="panel-heading">
                    <div>
                        <p className="section-eyebrow">薄弱项</p>
                        <h2 id="weak-words-title">薄弱词汇</h2>
                        <p className="panel-subtitle">
                            {activePack === null ? "未选择词书" : getPackDisplayName(activePack)}
                        </p>
                    </div>
                </div>

                <ul className="focus-list">
                    {state.weakWords.slice(0, 5).map((word) => (
                        <li key={word.term}>
                            <strong>{word.term}</strong>
                            <span>
                                最近 {word.totalCount} 次错 {word.wrongCount} 次
                            </span>
                        </li>
                    ))}
                </ul>
                {state.weakWords.length === 0 ? (
                    <div className="empty-state empty-state--compact">暂无薄弱词记录。</div>
                ) : null}
            </aside>
        </div>
    );
}

function ChartBar({
    day,
    height,
    value,
}: {
    day: string;
    height: string;
    value: string;
}): ReactElement {
    return (
        <div className="chart-bar">
            <span className="chart-bar__value">{value}</span>
            <span className="chart-bar__track" aria-hidden="true">
                <span style={{ height }} />
            </span>
            <span className="chart-bar__day">{day}</span>
        </div>
    );
}

function SettingsPanel({
    onAnnouncement,
    onStateChange,
    state,
}: {
    onAnnouncement: (message: string) => void;
    onStateChange: (state: LearningWorkspaceState) => void;
    state: LearningWorkspaceState;
}): ReactElement {
    const [formState, setFormState] = useState<UserSettings>(state.settings);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [operationMessage, setOperationMessage] = useState<string | null>(null);

    useEffect(() => {
        setFormState(state.settings);
    }, [state.settings]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        setIsSaving(true);

        try {
            const nextState = await saveUserSettings(formState);

            onStateChange(nextState);
            onAnnouncement("设置已保存。");
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async (): Promise<void> => {
        setIsExporting(true);
        setOperationMessage(null);

        try {
            const exportedPath = await exportLearningBackup();

            if (exportedPath === null) {
                setOperationMessage("已取消导出。");
                return;
            }

            setOperationMessage("本地数据已导出为备份文件。");
            onAnnouncement("本地数据已导出。");
        } catch (error) {
            const message = error instanceof Error ? error.message : "导出本地数据失败。";

            setOperationMessage(message);
            onAnnouncement(message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async (): Promise<void> => {
        setIsImporting(true);
        setOperationMessage(null);

        try {
            const result = await importLearningBackup();

            if (result === null) {
                setOperationMessage("已取消恢复。");
                return;
            }

            setFormState(result.state.settings);
            onStateChange(result.state);
            setOperationMessage("备份已恢复，工作台数据已刷新。");
            onAnnouncement("备份已恢复。");
        } catch (error) {
            const message = error instanceof Error ? error.message : "恢复本地数据失败。";

            setOperationMessage(message);
            onAnnouncement(message);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <section className="panel" aria-labelledby="settings-title">
            <div className="panel-heading">
                <div>
                    <p className="section-eyebrow">偏好</p>
                    <h2 id="settings-title">练习偏好</h2>
                </div>
            </div>

            <form className="settings-form" onSubmit={handleSubmit}>
                <label className="setting-row" htmlFor="daily-target">
                    <span>
                        <strong>每日目标</strong>
                        <small>决定今日练习页默认生成的题量。</small>
                    </span>
                    <input
                        id="daily-target"
                        min="1"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            setFormState((current) => ({
                                ...current,
                                dailyTarget: Number(event.target.value),
                            }));
                        }}
                        type="number"
                        value={formState.dailyTarget}
                    />
                </label>

                <fieldset className="setting-row">
                    <legend>
                        <strong>答案严格度</strong>
                        <small>用于控制大小写、标点和空格归一化。</small>
                    </legend>
                    <div className="segmented-control" aria-label="答案严格度">
                        {(["relaxed", "standard", "strict"] as const).map((strictness) => (
                            <button
                                aria-current={
                                    formState.strictness === strictness ? "true" : undefined
                                }
                                key={strictness}
                                onClick={() => {
                                    setFormState((current) => ({
                                        ...current,
                                        strictness,
                                    }));
                                }}
                                type="button"
                            >
                                {getStrictnessLabel(strictness)}
                            </button>
                        ))}
                    </div>
                </fieldset>

                <label className="checkbox-row">
                    <input
                        checked={formState.autoAddWrongAnswers}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            setFormState((current) => ({
                                ...current,
                                autoAddWrongAnswers: event.target.checked,
                            }));
                        }}
                        type="checkbox"
                    />
                    <span>练习后自动加入错词复习队列</span>
                </label>

                <label className="checkbox-row">
                    <input
                        checked={formState.onlyLicensedContent}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            setFormState((current) => ({
                                ...current,
                                onlyLicensedContent: event.target.checked,
                            }));
                        }}
                        type="checkbox"
                    />
                    <span>只使用来源明确的词书</span>
                </label>

                <div className="form-actions">
                    <button
                        className="secondary-button"
                        disabled={!state.isPersistent || isExporting || isImporting}
                        onClick={() => {
                            void handleExport();
                        }}
                        type="button"
                    >
                        {isExporting ? "导出中" : "导出本地数据"}
                    </button>
                    <button
                        className="secondary-button"
                        disabled={!state.isPersistent || isExporting || isImporting}
                        onClick={() => {
                            void handleImport();
                        }}
                        type="button"
                    >
                        {isImporting ? "恢复中" : "恢复备份"}
                    </button>
                    <button className="primary-button" disabled={isSaving} type="submit">
                        {isSaving ? "保存中" : "保存设置"}
                    </button>
                </div>

                {operationMessage === null ? null : (
                    <p className="form-note" role="status">
                        {operationMessage}
                    </p>
                )}
            </form>
        </section>
    );
}

export default App;
