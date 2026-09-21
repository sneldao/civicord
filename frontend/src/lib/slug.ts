// Must stay identical to slugify in scripts/build-map.mjs and build-search.mjs.
export function slugify(name: string): string {
  let s = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/&/g, " and ");
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "").replace(/--+/g, "-");
  return s;
}
