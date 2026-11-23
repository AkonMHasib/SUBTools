import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { dashboardApi as dashboardDataApi } from "../../api/dashboardApi";

const loadDashboard = async (forceRefresh = true) => {
  const [stats, trend, coverPage, dept, activities] = await Promise.all([
    dashboardDataApi.getStats(forceRefresh),
    dashboardDataApi.getRegistrationTrend(forceRefresh),
    dashboardDataApi.getCoverPageStats(forceRefresh),
    dashboardDataApi.getDeptDistribution(forceRefresh),
    dashboardDataApi.getActivities(),
  ]);

  return {
    stats,
    registrationTrend: trend,
    coverPageStats: coverPage,
    deptDistribution: dept,
    activities,
  };
};

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: fakeBaseQuery(),
  tagTypes: ["Dashboard"],
  keepUnusedDataFor: 60,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    dashboard: builder.query({
      queryFn: async ({ forceRefresh = true } = {}) => {
        try {
          return { data: await loadDashboard(forceRefresh) };
        } catch (error) {
          return {
            error: { status: "CUSTOM_ERROR", error: error?.message || "Failed to load dashboard" },
          };
        }
      },
      providesTags: ["Dashboard"],
    }),
  }),
});

export const { useDashboardQuery } = adminApi;
export default adminApi;
