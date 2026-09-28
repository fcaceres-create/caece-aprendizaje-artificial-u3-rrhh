import csvUrl from '../notebooks/datos/WA_Fn-UseC_-HR-Employee-Attrition.csv?url';
import informeUrl from '../informe/Informe_Attrition_IBM_HR.pdf?url';

const REPO = 'fcaceres-create/caece-aprendizaje-artificial-u3-rrhh';

export const ENLACES = {
  informe: informeUrl,
  dataset: csvUrl,
  notebook: './notebook.html',
  colab: `https://colab.research.google.com/github/${REPO}/blob/main/notebooks/Attrition_IBM_HR.ipynb`,
  github: `https://github.com/${REPO}`,
  paper: 'https://doi.org/10.1088/1757-899X/830/3/032001',
};
