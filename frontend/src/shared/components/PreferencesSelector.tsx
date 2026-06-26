import { FilterDropDown } from "../../features/courses/components/FilterDropDown";
import type { IRecommendationPreferencesUpdate } from "../interfaces/IRecommendation";
import {
    courseTypesDict,
    type CategoryTypes,
    type CourseTypeTypes,
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

const FIELDS = [
    {
        key: "preferred_sites" as const,
        label: "Plataforma",
        placeholder: "Elige plataformas…",
        options: courseTypesDict.SiteTypes,
    },
    {
        key: "preferred_categories" as const,
        label: "Categoría",
        placeholder: "Elige categorías…",
        options: courseTypesDict.CategoryTypes,
    },
    {
        key: "preferred_languages" as const,
        label: "Idioma",
        placeholder: "Elige idiomas…",
        options: courseTypesDict.LanguageTypes,
    },
    {
        key: "preferred_course_types" as const,
        label: "Tipo de curso",
        placeholder: "Elige tipos de curso…",
        options: courseTypesDict.CourseTypeTypes,
    },
] as const;

export function PreferencesSelector({
    value,
    onChange,
    disabled = false,
}: PreferencesSelectorProps) {
    const labelCn = settingsFieldLabelClassName();

    const updateField = (
        key: keyof IRecommendationPreferencesUpdate,
        selected: string[],
        allowed: readonly string[],
    ) => {
        if (disabled) return;

        let typed: SiteTypes[] | CategoryTypes[] | LanguageTypes[] | CourseTypeTypes[];
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
        }

        onChange({ ...value, [key]: typed });
    };

    return (
        <div className="flex flex-col gap-4">
            {FIELDS.map(({ key, label, placeholder, options }) => (
                <div key={key}>
                    <span className={labelCn}>{label}</span>
                    <div className={`mt-2 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
                        <FilterDropDown
                            label={placeholder}
                            options={[...options]}
                            value={(value[key] as string[] | undefined) ?? []}
                            onChange={(selected) => updateField(key, selected, options)}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
