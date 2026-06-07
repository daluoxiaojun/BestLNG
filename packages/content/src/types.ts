export interface ContentLicense {
    readonly name: string;
    readonly url?: string;
    readonly attribution: string;
}

export interface ContentPackageManifest {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly description?: string;
    readonly sourceLanguage: string;
    readonly targetLanguage: string;
    readonly license?: ContentLicense;
    readonly authors: readonly string[];
}

export interface ContentBlank {
    readonly id: string;
    readonly answer: string;
    readonly acceptedAnswers?: readonly string[];
    readonly hint?: string;
}

export interface ContentSentence {
    readonly id: string;
    readonly text: string;
    readonly translation: string;
    readonly blanks: readonly ContentBlank[];
    readonly tags?: readonly string[];
}

export interface ContentPackage {
    readonly manifest: ContentPackageManifest;
    readonly sentences: readonly ContentSentence[];
}

export interface GeneratedClozeExerciseInput {
    readonly id: string;
    readonly sentence: string;
    readonly translation: string;
    readonly blanks: readonly ContentBlank[];
    readonly sourcePackageId: string;
    readonly tags: readonly string[];
}

export interface ContentValidationIssue {
    readonly path: string;
    readonly message: string;
}

export interface ContentValidationResult {
    readonly isValid: boolean;
    readonly issues: readonly ContentValidationIssue[];
}
