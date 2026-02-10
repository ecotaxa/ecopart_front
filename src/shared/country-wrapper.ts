import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(en);

export type CountryOption = {
    code: string;
    name: string;
};

export class CountriesWrapper {
    static list(): CountryOption[] {
        const names = countries.getNames("en", { select: "official" });

        return Object.entries(names)
            .map(([code, name]) => ({ code, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    static isValid(code: string): boolean {
        return countries.isValid(code);
    }

    static getName(code: string): string | null {
        return countries.getName(code, "en") ?? null;
    }
}
