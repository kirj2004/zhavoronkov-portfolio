/**
 * Портфолио-лендинг — набор презентационных компонентов.
 *
 * Все компоненты принимают готовые данные и не содержат расчётов,
 * сетевых запросов и доменной логики: её место — в бэкенде.
 * Экспорт через файл- barrel, чтобы импорт на странице был один.
 */
export { default as HeroSection } from "./HeroSection";
export { default as PainCard } from "./PainCard";
export { default as ServiceCard } from "./ServiceCard";
export { default as CaseCard } from "./CaseCard";
export { default as Calculator, DEFAULT_FIELDS } from "./Calculator";
export { default as ApiFlow } from "./ApiFlow";
export { default as ContactItem } from "./ContactItem";
export { default as ContactForm, STEPS as FORM_STEPS, BRIEF_OPTIONS } from "./ContactForm";
export { default as SectionHeader } from "./SectionHeader";
export { default as RoasBars } from "./RoasBars";
