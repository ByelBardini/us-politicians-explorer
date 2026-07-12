import { describe, expect, it } from 'vitest';

import { mapPersonToPolitico } from '../../openstates/mapper.js';
import type { OpenStatesPerson } from '../../openstates/types.js';

import {
  deputadaSemFoto,
  senadoraCompleta,
  viceGovernadoraSemDistrito,
} from './helpers/pessoas-reais.js';

/** O estado da busca, usado como fallback quando `jurisdiction` não vem. */
const ESTADO_DA_BUSCA = 'California';

const mapear = (pessoa: OpenStatesPerson) => mapPersonToPolitico(pessoa, ESTADO_DA_BUSCA);

/** Pessoa mínima: só o que a API garante. */
const minima = (extras: Partial<OpenStatesPerson> = {}): OpenStatesPerson => ({
  id: 'ocd-person/1',
  name: 'Fulano',
  ...extras,
});

describe('mapPersonToPolitico', () => {
  it('mapeia uma pessoa real e completa', () => {
    const politico = mapear(senadoraCompleta);

    expect(politico).toEqual({
      openstatesId: 'ocd-person/295965df-6c71-4e11-806f-2b7d5be5d45c',
      nome: 'Aisha Wahab',
      primeiroNome: 'Aisha',
      sobrenome: 'Wahab',
      cargo: 'Senator',
      camara: 'upper',
      distrito: '10',
      estado: 'California',
      partido: 'Democratic',
      foto: 'https://www.senate.ca.gov/sites/senate.ca.gov/files/senator_photos/wahab_aisha.jpg',
      email: 'senator.wahab@senate.ca.gov',
      genero: 'Female',
      nascimento: new Date('1978-07-02'),
      falecimento: null,
      openstatesUrl: 'https://openstates.org/person/aisha-wahab-1G1XVDXnCp2Y7tFkVGjxiG/',
      contatos: senadoraCompleta.offices,
      raw: senadoraCompleta,
    });
  });

  describe('strings vazias viram null (a API não usa null)', () => {
    it('converte distrito, email, genero e datas vazias do registro executivo', () => {
      const politico = mapear(viceGovernadoraSemDistrito);

      expect(politico.distrito).toBeNull();
      expect(politico.email).toBeNull();
      expect(politico.genero).toBeNull();
      expect(politico.nascimento).toBeNull();
      expect(politico.falecimento).toBeNull();
      // O que existe continua preenchido.
      expect(politico.cargo).toBe('Lt_Governor');
      expect(politico.camara).toBe('executive');
    });

    it('converte foto vazia em null, preservando o email', () => {
      const politico = mapear(deputadaSemFoto);

      expect(politico.foto).toBeNull();
      expect(politico.email).toBe('assemblymember.bains@assembly.ca.gov');
    });

    it.each(['foto', 'email', 'partido', 'primeiroNome', 'sobrenome', 'genero'] as const)(
      'converte %s vazio em null',
      (campo) => {
        const politico = mapear(
          minima({
            image: '',
            email: '',
            party: '',
            given_name: '',
            family_name: '',
            gender: '',
          }),
        );

        expect(politico[campo]).toBeNull();
      },
    );
  });

  describe('current_role', () => {
    it('deixa cargo, camara e distrito nulos quando current_role não vem', () => {
      const politico = mapear(minima());

      expect(politico.cargo).toBeNull();
      expect(politico.camara).toBeNull();
      expect(politico.distrito).toBeNull();
    });

    it('converte distrito numérico para string', () => {
      // O contrato admite integer, ainda que a California mande string.
      const politico = mapear(
        minima({ current_role: { title: 'Senator', org_classification: 'upper', district: 3 } }),
      );

      expect(politico.distrito).toBe('3');
    });

    it('preserva distrito não-numérico', () => {
      const politico = mapear(
        minima({
          current_role: { title: 'Rep', org_classification: 'lower', district: 'At-Large' },
        }),
      );

      expect(politico.distrito).toBe('At-Large');
    });

    it('não confunde o distrito "0" com ausência', () => {
      const politico = mapear(
        minima({ current_role: { title: 'Rep', org_classification: 'lower', district: 0 } }),
      );

      expect(politico.distrito).toBe('0');
    });
  });

  describe('estado', () => {
    it('vem de jurisdiction.name', () => {
      const politico = mapPersonToPolitico(
        minima({
          jurisdiction: { id: 'ocd/ny', name: 'New York', classification: 'state' },
        }),
        ESTADO_DA_BUSCA,
      );

      expect(politico.estado).toBe('New York');
    });

    it('cai no estado da busca quando jurisdiction não vem', () => {
      expect(mapear(minima()).estado).toBe('California');
    });

    it('cai no estado da busca quando jurisdiction.name é vazio', () => {
      const politico = mapear(
        minima({ jurisdiction: { id: 'ocd/x', name: '', classification: 'state' } }),
      );

      expect(politico.estado).toBe('California');
    });
  });

  describe('datas', () => {
    it('parseia birth_date e death_date válidos', () => {
      const politico = mapear(minima({ birth_date: '1960-05-04', death_date: '2020-01-31' }));

      expect(politico.nascimento).toEqual(new Date('1960-05-04'));
      expect(politico.falecimento).toEqual(new Date('2020-01-31'));
    });

    it('devolve null para data inválida em vez de Invalid Date', () => {
      // Um Invalid Date estouraria na escrita do Prisma.
      const politico = mapear(minima({ birth_date: 'nao-e-data' }));

      expect(politico.nascimento).toBeNull();
    });
  });

  describe('contatos', () => {
    it('mapeia offices para contatos', () => {
      expect(mapear(senadoraCompleta).contatos).toEqual(senadoraCompleta.offices);
    });

    it('devolve null quando offices vem como lista vazia', () => {
      expect(mapear(viceGovernadoraSemDistrito).contatos).toBeNull();
    });

    it('devolve null quando offices não vem (sem include=offices)', () => {
      expect(mapear(minima()).contatos).toBeNull();
    });
  });

  it('guarda o payload completo em raw, para backfill sem re-sync', () => {
    expect(mapear(senadoraCompleta).raw).toEqual(senadoraCompleta);
  });

  it('é puro: não muta a pessoa recebida', () => {
    const original = structuredClone(senadoraCompleta);

    mapear(senadoraCompleta);

    expect(senadoraCompleta).toEqual(original);
  });

  it('preserva openstatesId e nome, os únicos campos sempre presentes', () => {
    const politico = mapear(minima({ id: 'ocd-person/xyz', name: 'Ciclana' }));

    expect(politico.openstatesId).toBe('ocd-person/xyz');
    expect(politico.nome).toBe('Ciclana');
  });
});
