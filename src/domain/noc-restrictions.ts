import type { EnvironmentRestriction } from './noc';

interface RestrictionDefinition extends EnvironmentRestriction {
  environmentPattern: RegExp;
}

const restrictionDefinitions: RestrictionDefinition[] = [
  {
    id: 'terphane-local-it-access',
    label: 'Restrição conhecida',
    note: 'Visibilidade limitada por uma restrição conhecida da TI local da Terphane.',
    active: true,
    environmentPattern: /terphane/i,
  },
  {
    id: 'arlanxeo-local-it-access',
    label: 'Restrição conhecida',
    note: 'Visibilidade limitada por uma restrição conhecida da TI local da Arlanxeo.',
    active: true,
    environmentPattern: /arlanxeo/i,
  },
];

export function getEnvironmentRestriction(environmentName: string): EnvironmentRestriction | undefined {
  const definition = restrictionDefinitions.find(
    restriction => restriction.active && restriction.environmentPattern.test(environmentName)
  );

  if (!definition) return undefined;

  return {
    id: definition.id,
    label: definition.label,
    note: definition.note,
    active: definition.active,
  };
}
