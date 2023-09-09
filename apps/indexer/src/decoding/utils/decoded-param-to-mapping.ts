import { DecodedParameter } from '../types/decoded-parameter';

export const decodedParamToMapping = (
  decodedParameters: DecodedParameter[],
): { [name: string]: DecodedParameter } => {
  const nameMapping: { [name: string]: DecodedParameter } = {};

  for (const param of decodedParameters) {
    nameMapping[param.name] = param;
  }

  return nameMapping;
};

export const decodedParamToKeyValueMapping = (
  decodedParameters: DecodedParameter[],
): { [name: string]: string } => {
  return decodedParameters.reduce((map, parameter) => {
    map[parameter.name] = parameter.value;
    return map;
  }, {});
};
