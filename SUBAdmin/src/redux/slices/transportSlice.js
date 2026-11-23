// Transport Management Redux Slice
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { transportApi } from "../../api/transportApi";
import { fetchDashboardData } from "./dashboardSlice";

const TRANSPORT_CACHE_KEY = "subtools_transport_cache";
const TRANSPORT_CACHE_TTL_MS = 5 * 60 * 1000;

const readTransportCache = (ignoreExpiration = false) => {
  try {
    const rawCache = localStorage.getItem(TRANSPORT_CACHE_KEY);
    if (!rawCache) return null;
    const parsedCache = JSON.parse(rawCache);
    if (!ignoreExpiration && Date.now() - parsedCache?.cachedAt > TRANSPORT_CACHE_TTL_MS) {
      return null;
    }
    return parsedCache;
  } catch (error) {
    return null;
  }
};

const writeTransportCache = (payload) => {
  try {
    localStorage.setItem(
      TRANSPORT_CACHE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        payload,
      }),
    );
  } catch (error) {}
};

const initialCache = readTransportCache(true);
const initialBuses = initialCache?.payload?.buses || [];
const initialRoutes = initialCache?.payload?.routes || [];

const initialState = {
  buses: initialBuses,
  routes: initialRoutes,
  filteredBuses: initialBuses,
  filteredRoutes: initialRoutes,
  searchQuery: "",
  loading: false,
  loaded: !!initialCache,
  lastFetchedAt: initialCache?.cachedAt || null,
  error: null,
  success: false,
};

export const fetchBusesAndRoutes = createAsyncThunk(
  "transport/fetchAll",
  async (options = {}, { rejectWithValue }) => {
    try {
      const { forceRefresh = false } = options;
      const [buses, routes] = await Promise.all([
        transportApi.getBuses(forceRefresh),
        transportApi.getRoutes(forceRefresh),
      ]);
      const payload = { buses, routes };
      writeTransportCache(payload);
      return payload;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch transport data");
    }
  },
  {
    condition: (options = {}, { getState }) => {
      const { forceRefresh = false } = options;
      const { transport } = getState();
      if (transport.loading) {
        return false;
      }
      if (!forceRefresh) {
        const cached = readTransportCache();
        if (cached?.payload) {
          return false;
        }
      }
      return true;
    },
  },
);

// Bus CRUD
export const createBus = createAsyncThunk(
  "transport/createBus",
  async (busData, { dispatch, rejectWithValue }) => {
    try {
      const res = await transportApi.createBus(busData);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to create bus");
    }
  },
);

export const updateBus = createAsyncThunk(
  "transport/updateBus",
  async ({ id, updatedData }, { dispatch, rejectWithValue }) => {
    try {
      const res = await transportApi.updateBus(id, updatedData);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to update bus");
    }
  },
);

export const deleteBus = createAsyncThunk(
  "transport/deleteBus",
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await transportApi.deleteBus(id);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return id;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to delete bus");
    }
  },
);

export const resetBusOverrides = createAsyncThunk(
  "transport/resetOverrides",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const res = await transportApi.resetBusOverrides();
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to reset bus overrides");
    }
  },
);

// Route CRUD
export const createRoute = createAsyncThunk(
  "transport/createRoute",
  async (routeData, { dispatch, rejectWithValue }) => {
    try {
      const res = await transportApi.createRoute(routeData);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to create route");
    }
  },
);

export const updateRoute = createAsyncThunk(
  "transport/updateRoute",
  async ({ id, updatedData }, { dispatch, rejectWithValue }) => {
    try {
      const res = await transportApi.updateRoute(id, updatedData);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return res;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to update route");
    }
  },
);

export const deleteRoute = createAsyncThunk(
  "transport/deleteRoute",
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await transportApi.deleteRoute(id);
      dispatch(fetchDashboardData({ forceRefresh: true }));
      return id;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to delete route");
    }
  },
);

const transportSlice = createSlice({
  name: "transport",
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      applySearch(state);
    },
    clearTransportStatus: (state) => {
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusesAndRoutes.pending, (state, action) => {
        state.loading = (state.buses.length === 0 && state.routes.length === 0) || action.meta.arg?.forceRefresh;
        state.error = null;
      })
      .addCase(fetchBusesAndRoutes.fulfilled, (state, action) => {
        state.loading = false;
        const busesChanged = JSON.stringify(state.buses) !== JSON.stringify(action.payload.buses);
        const routesChanged = JSON.stringify(state.routes) !== JSON.stringify(action.payload.routes);
        if (busesChanged || routesChanged) {
          state.buses = action.payload.buses;
          state.routes = action.payload.routes;
          applySearch(state);
        }
        state.loaded = true;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchBusesAndRoutes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Bus Cases
      .addCase(createBus.fulfilled, (state, action) => {
        state.buses.unshift(action.payload);
        applySearch(state);
        state.success = true;
        writeTransportCache({ buses: state.buses, routes: state.routes });
        state.lastFetchedAt = Date.now();
      })
      .addCase(updateBus.fulfilled, (state, action) => {
        const index = state.buses.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) {
          state.buses[index] = action.payload;
        }
        applySearch(state);
        state.success = true;
        writeTransportCache({ buses: state.buses, routes: state.routes });
        state.lastFetchedAt = Date.now();
      })
      .addCase(deleteBus.fulfilled, (state, action) => {
        const targetId = String(action.payload || "");
        state.buses = state.buses.filter(
          (b) => String(b.id || b.docId || "") !== targetId,
        );
        applySearch(state);
        state.success = true;
        writeTransportCache({ buses: state.buses, routes: state.routes });
        state.lastFetchedAt = Date.now();
      })
      .addCase(resetBusOverrides.fulfilled, (state, action) => {
        state.buses = action.payload;
        applySearch(state);
        state.success = true;
        writeTransportCache({ buses: state.buses, routes: state.routes });
        state.lastFetchedAt = Date.now();
      })
      // Route Cases
      .addCase(createRoute.fulfilled, (state, action) => {
        state.routes.unshift(action.payload);
        applySearch(state);
        state.success = true;
        writeTransportCache({ buses: state.buses, routes: state.routes });
        state.lastFetchedAt = Date.now();
      })
      .addCase(updateRoute.fulfilled, (state, action) => {
        const targetId = String(action.payload.id || action.payload.docId || "");
        const index = state.routes.findIndex(
          (r) => String(r.id || r.docId || "") === targetId,
        );
        if (index !== -1) {
          state.routes[index] = action.payload;
        }
        applySearch(state);
        state.success = true;
        writeTransportCache({ buses: state.buses, routes: state.routes });
        state.lastFetchedAt = Date.now();
      })
      .addCase(deleteRoute.fulfilled, (state, action) => {
        const targetId = String(action.payload || "");
        state.routes = state.routes.filter(
          (r) => String(r.id || r.docId || "") !== targetId,
        );
        applySearch(state);
        state.success = true;
        writeTransportCache({ buses: state.buses, routes: state.routes });
        state.lastFetchedAt = Date.now();
      });
  },
});

function applySearch(state) {
  const searchLower = state.searchQuery.toLowerCase();

  state.filteredBuses = state.buses.filter((bus) => {
    return (
      bus.name.toLowerCase().includes(searchLower) ||
      bus.number.toLowerCase().includes(searchLower) ||
      (bus.driver && bus.driver.toLowerCase().includes(searchLower))
    );
  });

  state.filteredRoutes = state.routes.filter((route) => {
    return (
      route.name.toLowerCase().includes(searchLower) ||
      route.code.toLowerCase().includes(searchLower) ||
      route.pickupPoints.some((p) => p.toLowerCase().includes(searchLower))
    );
  });
}

export const { setSearchQuery, clearTransportStatus } = transportSlice.actions;
export default transportSlice.reducer;
