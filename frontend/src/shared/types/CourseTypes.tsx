/*
#Site
#Coursera        2819
#Future Learn    2031
#Udacity          277
#Simplilearn      146*/
export type SiteTypes =
    | "Coursera"
    | "Future Learn"
    | "Udacity"
    | "Simplilearn"
    | "Academy"

/**
#Category
#Non defined                         2454
#business                             897
#computer science                     457
#data science                         450
#health                               264
#information technology               222
#physical science and engineering     150
#arts and humanities                  120
#language learning                     86
#social sciences                       83
#personal development                  68
#math and logic                        22
 */
export type CategoryTypes =
    | "Non defined"
    | "business"
    | "computer science"
    | "data science"
    | "health"
    | "information technology"
    | "physical science and engineering"
    | "arts and humanities"
    | "language learning"
    | "social sciences"
    | "personal development"
    | "math and logic";

/**
#Language
#English                   2726
#Non defined               2454
#Spanish                     58
#French                      11
#Japanese                     8
#Portuguese (Brazilian)       5
#Chinese (Simplified)         5
#German                       3
#Arabic                       1
#Indonesian                   1
#Russian                      1
 */
export type LanguageTypes =
    | "English"
    | "Non defined"
    | "Spanish"
    | "French"
    | "Japanese"
    | "Portuguese (Brazilian)"
    | "Chinese (Simplified)"
    | "German"
    | "Arabic"
    | "Indonesian"
    | "Russian";

/**
#Course Type
#Specialization
#Professional Certificate
#Course
#Project
#Non defined
 */
export type CourseTypeTypes =
    | "Specialization"
    | "Professional Certificate"
    | "Course"
    | "Project"
    | "Non defined";

export const courseTypesDict = {
    SiteTypes: ["Coursera", "Future Learn", "Udacity", "Simplilearn", "Academy"],
    CategoryTypes: [
        "Non defined",
        "business",
        "computer science",
        "data science",
        "health",
        "information technology",
        "physical science and engineering",
        "arts and humanities",
        "language learning",
        "social sciences",
        "personal development",
        "math and logic",
    ],
    LanguageTypes: [
        "English",
        "Non defined",
        "Spanish",
        "French",
        "Japanese",
        "Portuguese (Brazilian)",
        "Chinese (Simplified)",
        "German",
        "Arabic",
        "Indonesian",
        "Russian",
    ],
    CourseTypeTypes: [
        "Specialization",
        "Professional Certificate",
        "Course",
        "Project",
        "Non defined",
    ],
};