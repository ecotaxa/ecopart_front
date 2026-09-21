import type { ReactNode } from "react";
import { Link } from "@mui/material";

import { API_BASE_URL } from "@/config/api";

/**
 * Editorial content of the About page: every list the page renders and every
 * outside destination it links to, so wording or a URL is changed here without
 * touching the layout components.
 */

/** Outside destinations of the About page. */
export const ABOUT_LINKS = {
    ecotaxa: "https://ecotaxa.obs-vlfr.fr/",
    /** Swagger UI served by the EcoPart backend. */
    apiDocs: `${API_BASE_URL}/api-docs`,
    argo: "https://argo.ucsd.edu/",
    piqvInstrumentManuals: "https://sites.google.com/view/piqv/piqv-manuals",
    piqvSoftwareManuals: "https://sites.google.com/view/piqv/piqv-softwares",
    contactEmail: "ecopart@group.imev-mer.fr",
};

/** Reference to cite when EcoTaxa or EcoPart is used in a publication. */
export const CITATION = {
    authors: "Picheral M, Colin S, Irisson J-O (2017).",
    title: "EcoTaxa, a tool for the taxonomic classification of images",
    url: "http://ecotaxa.obs-vlfr.fr",
};

export interface Partner {
    name: string;
    /** Path under `public/partners/`. */
    logo: string;
}

/** Institutions and projects funding EcoPart, in the order their logos are shown. */
export const PARTNERS: Partner[] = [
    { name: "Sorbonne Université", logo: "/partners/sorbonne-universite.png" },
    { name: "CNRS", logo: "/partners/cnrs.webp" },
    { name: "SCORE", logo: "/partners/score.png" },
    { name: "MOOSE", logo: "/partners/moose.png" },
    { name: "ANERIS", logo: "/partners/aneris.png" },
    { name: "LOV — Laboratoire d'Océanographie de Villefranche", logo: "/partners/lov.jpg" },
    { name: "Horizon Europe", logo: "/partners/horizon-europe.jpg" },
    { name: "IMEV — Institut de la Mer de Villefranche", logo: "/partners/imev.jpg" },
];

export interface Instrument {
    name: string;
    /** Thumbnail under `public/about/`; a placeholder is drawn while the file is missing. */
    image: string;
    description: ReactNode;
    /** Instrument entry in the BODC (NERC Vocabulary Server) device catalogue. */
    learnMoreUrl: string;
}

// Same entries the backend seeds in `instrument_model.bodc_url`.
const BODC_UVP5 = "https://vocab.nerc.ac.uk/collection/L22/current/TOOL1577/";
const BODC_UVP6 = "https://vocab.nerc.ac.uk/collection/L22/current/TOOL1578/";

/** The instruments whose data EcoPart hosts. */
export const INSTRUMENTS: Instrument[] = [
    {
        name: "UVP5",
        image: "/about/uvp5.jpg",
        description: (
            <>
                The UVP5 is an <em>in situ</em> imaging system for the measurement and quantification of particles
                (&gt;100 µm) and the classification of larger objects (&gt;700 µm) by imaging them in a known volume of
                water. It is deployed as a standalone instrument or, more frequently, on CTDs. All versions of UVP5 are
                supported: UVP5SD, UVP5Z, UVP5HD.
            </>
        ),
        learnMoreUrl: BODC_UVP5,
    },
    {
        name: "UVP6",
        image: "/about/uvp6.jpg",
        description: (
            <>
                The UVP6 is a miniaturized version of the UVP5, with the same general characteristics (counts and sizes
                particles &gt;80 µm, images objects &gt;620 µm). The High Frequency version (HF) can be deployed at fast
                speeds (&gt;1 m.s⁻¹) and is appropriate for CTDs and AUVs. The Low Power version (LP) is specifically
                designed for autonomous platforms such as gliders, floats, moorings, etc.
            </>
        ),
        learnMoreUrl: BODC_UVP6,
    },
    {
        name: "UVP6, remote mode",
        image: "/about/uvp6-remote.jpg",
        description: (
            <>
                The UVP6 in the{" "}
                <Link href={ABOUT_LINKS.argo} target="_blank" rel="noopener noreferrer" fontWeight={600}>
                    ARGO
                </Link>{" "}
                program can transmit particle counts and sizes in real time to its vector, which can then send this
                information through a remote (e.g. satellite) connection. A version also provides the identification of
                large objects on images, thanks to an embedded classifier. In this mode, the information transmitted
                has a lower spatio-temporal resolution than the original and images are never transmitted.
            </>
        ),
        learnMoreUrl: BODC_UVP6,
    },
    {
        name: "UVP6m",
        image: "/about/uvp6m.jpg",
        description: <>The UVP6 micro is coming soon.</>,
        learnMoreUrl: BODC_UVP6,
    },
];

export interface Feature {
    title: string;
    /** When set, the title links out (API docs, EcoTaxa). */
    href?: string;
    description: ReactNode;
}

/** What EcoPart offers on top of hosting the data. */
export const FEATURES: Feature[] = [
    {
        title: "API access",
        href: ABOUT_LINKS.apiDocs,
        description: (
            <>
                All of EcoPart's functionalities such as creating a project, importing or exporting data, are
                available through an Application Programming Interface (<strong>API</strong>). Through this API, you
                can automate tasks.
            </>
        ),
    },
    {
        title: "EcoTaxa classification",
        href: ABOUT_LINKS.ecotaxa,
        description: (
            <>
                Thanks to its co-development with EcoTaxa, EcoPart allows you to import unclassified images to EcoTaxa
                and export classifications from EcoTaxa.
            </>
        ),
    },
    {
        title: "Data quality control tools",
        description: (
            <>
                EcoPart includes quality control tools out of the box, to help you improve the consistency of your
                data. These tools help you identify potential metadata mismatches, such as instrument calibration
                settings from UVP-DB, or perform position cross-checks with CTD data, among others. EcoPart can then
                assist you in correcting your data and propagating your changes to the associated EcoTaxa projects.
            </>
        ),
    },
    {
        title: "Standard and reusable export formats",
        description: (
            <>
                Aggregated particle data is exported in the <strong>ODV</strong> (Ocean Data View) format, along with
                the plankton classifications coming from EcoTaxa.
                <br />
                <br />
                EcoPart is not a backup tool, so we don't provide an export of the whole folder of raw data imported.
                We expect you to ensure this backup.
            </>
        ),
    },
];

/** People credited in the page footer. */
export const DEVELOPERS = ["Julie Coustenoble", "Brahim Lamjarad"];
