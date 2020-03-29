/* eslint-disable no-else-return */
import moment from 'moment';
import {
  flatMap,
  keys,
  last,
  sortBy,
  uniq,
} from 'lodash';

import { CARBON_INTENSITY_DOMAIN, FOSSIL_FUEL_KEYS } from '../helpers/constants';

export function getSelectedZoneHistory(state) {
  const { selectedZoneName } = state.application;
  if (!selectedZoneName) { return []; }
  return state.data.countries[selectedZoneName].series || [];
}

export function getSelectedZoneExchangeKeys(state) {
  return state.application.electricityMixMode === 'consumption'
    ? sortBy(uniq(flatMap(getSelectedZoneHistory(state), d => keys(d.exchange))))
    : [];
}

export function getSelectedZoneHistoryDatetimes(state) {
  return getSelectedZoneHistory(state).map(d => moment(d.year.toString()).toDate());
}

// Use current time as the end time of the graph time scale explicitly
// as we want to make sure we account for the missing data at the end of
// the graph (when not inferable from historyData timestamps).
export function getZoneHistoryEndTime(state) {
  return '2019';
}

// TODO: Likewise, we should be passing an explicit startTime set to 24h
// in the past to make sure we show data is missing at the beginning of
// the graph, but right now that would create UI inconsistency with the
// other neighbouring graphs showing data over a bit longer time scale
// (see https://github.com/tmrowco/electricitymap-contrib/issues/2250).
export function getZoneHistoryStartTime(state) {
  return null;
}

export function getCurrentZoneData(state) {
  const zoneName = state.application.selectedZoneName;
  const zoneTimeIndex = state.application.selectedZoneTimeIndex;
  const { currentYear } = state.application;
  if (!zoneName) {
    return null;
  }
  if (zoneTimeIndex === null) {
    const { series } = state.data.countries[zoneName];
    if (!series) { return null; }
    return series.find(d => d.year === currentYear);
  }
  return getSelectedZoneHistory(state)[zoneTimeIndex];
}

export function getCarbonIntensity(carbonIntensityDomain, electricityMixMode, data) {
  if (!data) { return null; }
  if (carbonIntensityDomain === CARBON_INTENSITY_DOMAIN.ENERGY) {
    if (electricityMixMode === 'consumption') {
      return data['totalFootprintMegatonsCO2'] / data['totalPrimaryEnergyConsumptionTWh'] * 1000;
    } else {
      return data['totalEmissionsMegatonsCO2'] / data['totalPrimaryEnergyProductionTWh'] * 1000;
    }
  }
  if (carbonIntensityDomain === CARBON_INTENSITY_DOMAIN.POPULATION) {
    if (electricityMixMode === 'consumption') {
      return data['totalFootprintTonsCO2PerCapita'];
    } else {
      return data['totalEmissionsTonsCO2PerCapita'];
    }
  }
  if (carbonIntensityDomain === CARBON_INTENSITY_DOMAIN.GDP) {
    if (electricityMixMode === 'consumption') {
      return data['totalFootprintMegatonsCO2'] / data['gdpMillionsCurrentUSD'] * 1e6;
    } else {
      return data['totalEmissionsMegatonsCO2'] / data['gdpMillionsCurrentUSD'] * 1e6;
    }
  }
  throw new Error('Not implemented yet');
}

function getEnergyRatio(electricityMixMode, data, filter) {
  const key = electricityMixMode === 'consumption'
    ? 'primaryEnergyConsumptionTWh'
    : 'primaryEnergyProductionTWh';
  const keyTotal = electricityMixMode === 'consumption'
    ? 'totalPrimaryEnergyConsumptionTWh'
    : 'totalPrimaryEnergyProductionTWh';
  if (!data || !data[key]) {
    return { percentage: null };
  }
  return Object.keys(data[key])
    .filter(filter)
    .map(k => data[key][k])
    .reduce((a, b) => a + b, 0) / data[keyTotal];
}

export function getRenewableRatio(electricityMixMode, data) {
  return getEnergyRatio(electricityMixMode, data, k => !FOSSIL_FUEL_KEYS.includes(k) && k !== 'nuclear');
}
export function getLowcarbonRatio(electricityMixMode, data) {
  return getEnergyRatio(electricityMixMode, data, k => !FOSSIL_FUEL_KEYS.includes(k));
}
