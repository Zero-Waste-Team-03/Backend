/* eslint-disable */
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { inline } from '@css-inline/css-inline';
import * as glob from 'glob';
import { get } from 'lodash';

/**
 * Lightweight Handlebars adapter copied/adapted from the mailer package
 * to avoid importing deep subpaths that are blocked by package exports.
 */
export class HandlebarsAdapter {
  private precompiledTemplates: Record<string, handlebars.TemplateDelegate> =
    {};
  private config: {
    inlineCssOptions?: Record<string, unknown>;
    inlineCssEnabled?: boolean;
  } = {
    inlineCssOptions: {},
    inlineCssEnabled: true,
  };

  constructor(
    helpers?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) {
    // Handlebars helper gets options as last argument; use function signature
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handlebars.registerHelper('concat', function (...args: any[]) {
      // last argument is Handlebars options object
      args.pop();
      return args.join('');
    } as any);
    if (helpers) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      handlebars.registerHelper(helpers as any);
    }
    if (config) Object.assign(this.config, config);
  }

  // Match TemplateAdapter.compile signature
  compile(
    mail: any,
    callback: (err?: any, body?: string) => any,
    mailerOptions: any,
  ): void {
    const precompile = (
      template: string,
      options?: Record<string, unknown>,
    ) => {
      const templateBaseDir = get(options, 'dir', '') as string;
      const templateExt = path.extname(template) || '.hbs';
      let templateName = path.basename(template, path.extname(template));
      const templateDir = path.isAbsolute(template)
        ? path.dirname(template)
        : path.join(templateBaseDir, path.dirname(template));
      const templatePath = path.join(templateDir, templateName + templateExt);
      templateName = path
        .relative(templateBaseDir, templatePath)
        .replace(templateExt, '');

      if (!this.precompiledTemplates[templateName]) {
        try {
          const tpl = fs.readFileSync(templatePath, 'utf-8');
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          this.precompiledTemplates[templateName] = handlebars.compile(
            tpl,
            get(options, 'options', {}) as any,
          );
        } catch (err) {
          throw err as Error;
        }
      }

      return { templateExt, templateName, templateDir, templatePath };
    };

    const templateOpts =
      (mailerOptions && (mailerOptions.template as Record<string, unknown>)) ||
      {};
    let pre;
    try {
      pre = precompile(mail.data.template, templateOpts);
    } catch (err) {
      return callback(err);
    }
    const templateName = pre.templateName as string;

    const runtimeOptions = get(mailerOptions, 'options', {
      partials: false,
      data: {},
    }) as Record<string, unknown>;

    if ((runtimeOptions as any).partials) {
      const partialsDir = (runtimeOptions as any).partials.dir as string;
      const partialPath = path
        .join(partialsDir, '**', '*.hbs')
        .replace(/\\/g, '/');
      const files = glob.sync(partialPath);
      files.forEach((file) => {
        const { templateName: tName, templatePath } = precompile(
          file,
          (runtimeOptions as any).partials,
        );
        const templateDir = path.relative(
          (runtimeOptions as any).partials.dir as string,
          path.dirname(templatePath),
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        handlebars.registerPartial(
          path.join(templateDir, tName as string),
          fs.readFileSync(templatePath, 'utf-8'),
        );
      });
    }

    const templateFn = this.precompiledTemplates[templateName];
    if (!templateFn)
      return callback(new Error(`Template ${templateName} not compiled`));

    const rendered = templateFn(mail.data.context || {});
    if (this.config.inlineCssEnabled) {
      try {
        // eslint-disable @typescript-eslint/no-unsafe-argument
        mail.data.html = inline(
          rendered,
          this.config.inlineCssOptions as any,
        ) as string;
      } catch (e) {
        return callback(e as Error);
      }
    } else {
      mail.data.html = rendered;
    }

    return callback();
  }
}
