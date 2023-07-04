import { DecodedParameter } from '../types/decoded-parameter';

export const convertDecodedParamToMapping = (
  decodedParameters: DecodedParameter[],
): { [name: string]: DecodedParameter } => {
  const nameMapping: { [name: string]: DecodedParameter } = {};

  for (const param of decodedParameters) {
    nameMapping[param.name] = param;
  }

  return nameMapping;
};
