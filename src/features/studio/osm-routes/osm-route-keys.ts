export const osmRouteKeys = {
  all: ['studio-osm-routes'] as const,
  index: () => [...osmRouteKeys.all, 'index'] as const,
  route: (id: number) => [...osmRouteKeys.all, 'route', id] as const,
};
