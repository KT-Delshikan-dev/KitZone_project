import js from '@eslint/js';
export default [js.configs.recommended, { files:['src/**/*.js'], languageOptions:{ ecmaVersion:'latest', sourceType:'module', globals:{process:'readonly',Buffer:'readonly',TextEncoder:'readonly',console:'readonly',URL:'readonly',setTimeout:'readonly'} }, rules:{'no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^[A-Z_]'}]} }];
