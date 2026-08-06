import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { FilterDropDown } from "../../features/courses/components/FilterDropDown";
import type { IRecommendationPreferencesUpdate } from "../interfaces/IRecommendation";
import {
    courseTypesDict,
    getDifficultyLabels,
    getDurationBucketShortLabels,
    type CategoryTypes,
    type CourseTypeTypes,
    type DifficultyTypes,
    type DurationBucketTypes,
    type LanguageTypes,
    type SiteTypes,
} from "../types/CourseTypes";
import { settingsFieldLabelClassName } from "../../features/settings/components/settingsFieldLabelClassName";

type PreferencesSelectorProps = {
    value: IRecommendationPreferencesUpdate;
    onChange: (next: IRecommendationPreferencesUpdate) => void;
    disabled?: boolean;
};

function pickAllowed<T extends string>(values: string[], allowed: readonly string[]): T[] {
    return values.filter((v): v is T => allowed.includes(v));
}

function getFields(t: TFunction): ReadonlyArray<{
    key: keyof IRecommendationPreferencesUpdate;
    label: string;
    placeholder: string;
    options: readonly string[];
    optionLabels?: Record<string, string>;
}> {
    return [
        {
            key: "preferred_sites" as const,
            label: t("preferences.platform"),
            placeholder: t("preferences.platformPlaceholder"),
            options: courseTypesDict.SiteTypes,
        },
        {
            key: "preferred_categories" as const,
            label: t("preferences.category"),
            placeholder: t("preferences.categoryPlaceholder"),
            options: courseTypesDict.CategoryTypes,
        },
        {
            key: "preferred_languages" as const,
            label: t("preferences.language"),
            placeholder: t("preferences.languagePlaceholder"),
            options: courseTypesDict.LanguageTypes,
        },
        {
            key: "preferred_course_types" as const,
            label: t("preferences.courseType"),
            placeholder: t("preferences.courseTypePlaceholder"),
            options: courseTypesDict.CourseTypeTypes,
        },
        {
            key: "preferred_duration_buckets" as const,
            label: t("preferences.preferredDuration"),
            placeholder: t("preferences.durationPlaceholder"),
            options: courseTypesDict.DurationBucketTypes,
            optionLabels: getDurationBucketShortLabels(t),
        },
        {
            key: "preferred_difficulties" as const,
            label: t("preferences.preferredDifficulty"),
            placeholder: t("preferences.difficultyPlaceholder"),
            options: courseTypesDict.DifficultyTypes,
            optionLabels: getDifficultyLabels(t),
        },
    ];
}

export function PreferencesSelector({
    value,
    onChange,
    disabled = false,
}: PreferencesSelectorProps) {
    const { t } = useTranslation();
    const FIELDS = getFields(t);
    const labelCn = settingsFieldLabelClassName();

    const updateField = (
        key: keyof IRecommendationPreferencesUpdate,
        selected: string[],
        allowed: readonly string[],
    ) => {
        if (disabled) return;

        let typed:
            | SiteTypes[]
            | CategoryTypes[]
            | LanguageTypes[]
            | CourseTypeTypes[]
            | DurationBucketTypes[]
            | DifficultyTypes[];
        switch (key) {
            case "preferred_sites":
                typed = pickAllowed<SiteTypes>(selected, allowed);
                break;
            case "preferred_categories":
                typed = pickAllowed<CategoryTypes>(selected, allowed);
                break;
            case "preferred_languages":
                typed = pickAllowed<LanguageTypes>(selected, allowed);
                break;
            case "preferred_course_types":
                typed = pickAllowed<CourseTypeTypes>(selected, allowed);
                break;
            case "preferred_duration_buckets":
                typed = pickAllowed<DurationBucketTypes>(selected, allowed);
                break;
            case "preferred_difficulties":
                typed = pickAllowed<DifficultyTypes>(selected, allowed);
                break;
            default:
                return;
        }

        onChange({ ...value, [key]: typed });
    };

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map(({ key, label, placeholder, options, optionLabels }) => (
                <div key={key}>
                    <span className={labelCn}>{label}</span>
                    <div className={`mt-2 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
                        <FilterDropDown
                            label={placeholder}
                            options={[...options]}
                            optionLabels={optionLabels}
                            value={(value[key] as string[] | undefined) ?? []}
                            onChange={(selected) => updateField(key, selected, options)}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
