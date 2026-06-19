import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AcceptBidResponse, ActivityItem, AdminBlogPost, AdminBlogPostInput, AdminDeleteListingParams, AdminGetMarketIntelligenceParams, AdminListingInput, AdminListingsResponse, AdminManufacturerInput, AdminMapEntryInput, AdminOperator, AdminOperatorInput, AdminUploadBlogImage200, Bid, BidInput, CertificationToggle, CreateMyOperatorProfileInput, DashboardSummary, ErrorEnvelope, FreezeDryRequest, FreezeDryRequestInput, GenerateReportInput, HealthStatus, MachineryListing, MachineryListingInput, MarketIntelligenceData, MarketIntelligenceOverrideInput, Operator, OperatorInput, OperatorProfileUpdate, ReportSnapshot, RequestMessage, RequestMessageInput, UploadBlogCoverImage200, UploadUrlRequest, UploadUrlResponse } from './api.schemas';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListOperatorsUrl: () => string;
/**
 * @summary List all operators
 */
export declare const listOperators: (options?: RequestInit) => Promise<Operator[]>;
export declare const getListOperatorsQueryKey: () => readonly ["/api/operators"];
export declare const getListOperatorsQueryOptions: <TData = Awaited<ReturnType<typeof listOperators>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listOperators>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listOperators>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListOperatorsQueryResult = NonNullable<Awaited<ReturnType<typeof listOperators>>>;
export type ListOperatorsQueryError = ErrorType<unknown>;
/**
 * @summary List all operators
 */
export declare function useListOperators<TData = Awaited<ReturnType<typeof listOperators>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listOperators>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateOperatorUrl: () => string;
/**
 * @summary Create a new operator profile
 */
export declare const createOperator: (operatorInput: OperatorInput, options?: RequestInit) => Promise<Operator>;
export declare const getCreateOperatorMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOperator>>, TError, {
        data: BodyType<OperatorInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createOperator>>, TError, {
    data: BodyType<OperatorInput>;
}, TContext>;
export type CreateOperatorMutationResult = NonNullable<Awaited<ReturnType<typeof createOperator>>>;
export type CreateOperatorMutationBody = BodyType<OperatorInput>;
export type CreateOperatorMutationError = ErrorType<unknown>;
/**
* @summary Create a new operator profile
*/
export declare const useCreateOperator: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOperator>>, TError, {
        data: BodyType<OperatorInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof createOperator>>, TError, {
    data: BodyType<OperatorInput>;
}, TContext>;
export declare const getGetMyOperatorProfileUrl: () => string;
/**
 * @summary Get the authenticated operator's own profile
 */
export declare const getMyOperatorProfile: (options?: RequestInit) => Promise<Operator>;
export declare const getGetMyOperatorProfileQueryKey: () => readonly ["/api/operators/me"];
export declare const getGetMyOperatorProfileQueryOptions: <TData = Awaited<ReturnType<typeof getMyOperatorProfile>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyOperatorProfile>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMyOperatorProfile>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMyOperatorProfileQueryResult = NonNullable<Awaited<ReturnType<typeof getMyOperatorProfile>>>;
export type GetMyOperatorProfileQueryError = ErrorType<void>;
/**
 * @summary Get the authenticated operator's own profile
 */
export declare function useGetMyOperatorProfile<TData = Awaited<ReturnType<typeof getMyOperatorProfile>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyOperatorProfile>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateMyOperatorProfileUrl: () => string;
/**
 * @summary Create an operator profile for the authenticated user
 */
export declare const createMyOperatorProfile: (createMyOperatorProfileInput: CreateMyOperatorProfileInput, options?: RequestInit) => Promise<Operator>;
export declare const getCreateMyOperatorProfileMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMyOperatorProfile>>, TError, {
        data: BodyType<CreateMyOperatorProfileInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createMyOperatorProfile>>, TError, {
    data: BodyType<CreateMyOperatorProfileInput>;
}, TContext>;
export type CreateMyOperatorProfileMutationResult = NonNullable<Awaited<ReturnType<typeof createMyOperatorProfile>>>;
export type CreateMyOperatorProfileMutationBody = BodyType<CreateMyOperatorProfileInput>;
export type CreateMyOperatorProfileMutationError = ErrorType<void>;
/**
* @summary Create an operator profile for the authenticated user
*/
export declare const useCreateMyOperatorProfile: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMyOperatorProfile>>, TError, {
        data: BodyType<CreateMyOperatorProfileInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof createMyOperatorProfile>>, TError, {
    data: BodyType<CreateMyOperatorProfileInput>;
}, TContext>;
export declare const getUpdateMyOperatorProfileUrl: () => string;
/**
 * @summary Update the authenticated operator's own profile (non-admin fields only)
 */
export declare const updateMyOperatorProfile: (operatorProfileUpdate: OperatorProfileUpdate, options?: RequestInit) => Promise<Operator>;
export declare const getUpdateMyOperatorProfileMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMyOperatorProfile>>, TError, {
        data: BodyType<OperatorProfileUpdate>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateMyOperatorProfile>>, TError, {
    data: BodyType<OperatorProfileUpdate>;
}, TContext>;
export type UpdateMyOperatorProfileMutationResult = NonNullable<Awaited<ReturnType<typeof updateMyOperatorProfile>>>;
export type UpdateMyOperatorProfileMutationBody = BodyType<OperatorProfileUpdate>;
export type UpdateMyOperatorProfileMutationError = ErrorType<void>;
/**
* @summary Update the authenticated operator's own profile (non-admin fields only)
*/
export declare const useUpdateMyOperatorProfile: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMyOperatorProfile>>, TError, {
        data: BodyType<OperatorProfileUpdate>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateMyOperatorProfile>>, TError, {
    data: BodyType<OperatorProfileUpdate>;
}, TContext>;
export declare const getGetOperatorUrl: (id: number) => string;
/**
 * @summary Get an operator by ID
 */
export declare const getOperator: (id: number, options?: RequestInit) => Promise<Operator>;
export declare const getGetOperatorQueryKey: (id: number) => readonly [`/api/operators/${number}`];
export declare const getGetOperatorQueryOptions: <TData = Awaited<ReturnType<typeof getOperator>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOperator>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOperator>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOperatorQueryResult = NonNullable<Awaited<ReturnType<typeof getOperator>>>;
export type GetOperatorQueryError = ErrorType<void>;
/**
 * @summary Get an operator by ID
 */
export declare function useGetOperator<TData = Awaited<ReturnType<typeof getOperator>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOperator>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListRequestsUrl: () => string;
/**
 * @summary List all freeze-dry requests
 */
export declare const listRequests: (options?: RequestInit) => Promise<FreezeDryRequest[]>;
export declare const getListRequestsQueryKey: () => readonly ["/api/requests"];
export declare const getListRequestsQueryOptions: <TData = Awaited<ReturnType<typeof listRequests>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRequests>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listRequests>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListRequestsQueryResult = NonNullable<Awaited<ReturnType<typeof listRequests>>>;
export type ListRequestsQueryError = ErrorType<unknown>;
/**
 * @summary List all freeze-dry requests
 */
export declare function useListRequests<TData = Awaited<ReturnType<typeof listRequests>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRequests>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateRequestUrl: () => string;
/**
 * @summary Submit a new freeze-dry request
 */
export declare const createRequest: (freezeDryRequestInput: FreezeDryRequestInput, options?: RequestInit) => Promise<FreezeDryRequest>;
export declare const getCreateRequestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRequest>>, TError, {
        data: BodyType<FreezeDryRequestInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createRequest>>, TError, {
    data: BodyType<FreezeDryRequestInput>;
}, TContext>;
export type CreateRequestMutationResult = NonNullable<Awaited<ReturnType<typeof createRequest>>>;
export type CreateRequestMutationBody = BodyType<FreezeDryRequestInput>;
export type CreateRequestMutationError = ErrorType<unknown>;
/**
* @summary Submit a new freeze-dry request
*/
export declare const useCreateRequest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRequest>>, TError, {
        data: BodyType<FreezeDryRequestInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof createRequest>>, TError, {
    data: BodyType<FreezeDryRequestInput>;
}, TContext>;
export declare const getGetRequestUrl: (id: number) => string;
/**
 * @summary Get a request by ID
 */
export declare const getRequest: (id: number, options?: RequestInit) => Promise<FreezeDryRequest>;
export declare const getGetRequestQueryKey: (id: number) => readonly [`/api/requests/${number}`];
export declare const getGetRequestQueryOptions: <TData = Awaited<ReturnType<typeof getRequest>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRequest>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRequest>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRequestQueryResult = NonNullable<Awaited<ReturnType<typeof getRequest>>>;
export type GetRequestQueryError = ErrorType<void>;
/**
 * @summary Get a request by ID
 */
export declare function useGetRequest<TData = Awaited<ReturnType<typeof getRequest>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRequest>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListMessagesForRequestUrl: (id: number) => string;
/**
 * Returns the message thread for a request. Only the buyer who owns the request, operators who have bid on it, and admins can access this endpoint.
 * @summary List messages for a request
 */
export declare const listMessagesForRequest: (id: number, options?: RequestInit) => Promise<RequestMessage[]>;
export declare const getListMessagesForRequestQueryKey: (id: number) => readonly [`/api/requests/${number}/messages`];
export declare const getListMessagesForRequestQueryOptions: <TData = Awaited<ReturnType<typeof listMessagesForRequest>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMessagesForRequest>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMessagesForRequest>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMessagesForRequestQueryResult = NonNullable<Awaited<ReturnType<typeof listMessagesForRequest>>>;
export type ListMessagesForRequestQueryError = ErrorType<void>;
/**
 * @summary List messages for a request
 */
export declare function useListMessagesForRequest<TData = Awaited<ReturnType<typeof listMessagesForRequest>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMessagesForRequest>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getPostMessageForRequestUrl: (id: number) => string;
/**
 * @summary Post a message on a request
 */
export declare const postMessageForRequest: (id: number, requestMessageInput: RequestMessageInput, options?: RequestInit) => Promise<RequestMessage>;
export declare const getPostMessageForRequestMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof postMessageForRequest>>, TError, {
        id: number;
        data: BodyType<RequestMessageInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof postMessageForRequest>>, TError, {
    id: number;
    data: BodyType<RequestMessageInput>;
}, TContext>;
export type PostMessageForRequestMutationResult = NonNullable<Awaited<ReturnType<typeof postMessageForRequest>>>;
export type PostMessageForRequestMutationBody = BodyType<RequestMessageInput>;
export type PostMessageForRequestMutationError = ErrorType<void>;
/**
* @summary Post a message on a request
*/
export declare const usePostMessageForRequest: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof postMessageForRequest>>, TError, {
        id: number;
        data: BodyType<RequestMessageInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof postMessageForRequest>>, TError, {
    id: number;
    data: BodyType<RequestMessageInput>;
}, TContext>;
export declare const getListBidsForRequestUrl: (id: number) => string;
/**
 * @summary List bids for a request
 */
export declare const listBidsForRequest: (id: number, options?: RequestInit) => Promise<Bid[]>;
export declare const getListBidsForRequestQueryKey: (id: number) => readonly [`/api/requests/${number}/bids`];
export declare const getListBidsForRequestQueryOptions: <TData = Awaited<ReturnType<typeof listBidsForRequest>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBidsForRequest>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBidsForRequest>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBidsForRequestQueryResult = NonNullable<Awaited<ReturnType<typeof listBidsForRequest>>>;
export type ListBidsForRequestQueryError = ErrorType<unknown>;
/**
 * @summary List bids for a request
 */
export declare function useListBidsForRequest<TData = Awaited<ReturnType<typeof listBidsForRequest>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBidsForRequest>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateBidUrl: () => string;
/**
 * @summary Submit a bid on a request
 */
export declare const createBid: (bidInput: BidInput, options?: RequestInit) => Promise<Bid>;
export declare const getCreateBidMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBid>>, TError, {
        data: BodyType<BidInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBid>>, TError, {
    data: BodyType<BidInput>;
}, TContext>;
export type CreateBidMutationResult = NonNullable<Awaited<ReturnType<typeof createBid>>>;
export type CreateBidMutationBody = BodyType<BidInput>;
export type CreateBidMutationError = ErrorType<unknown>;
/**
* @summary Submit a bid on a request
*/
export declare const useCreateBid: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBid>>, TError, {
        data: BodyType<BidInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBid>>, TError, {
    data: BodyType<BidInput>;
}, TContext>;
export declare const getPatchOperatorCertificationUrl: (id: number) => string;
/**
 * @summary Toggle a single certification's verified status (admin only)
 */
export declare const patchOperatorCertification: (id: number, certificationToggle: CertificationToggle, options?: RequestInit) => Promise<Operator>;
export declare const getPatchOperatorCertificationMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof patchOperatorCertification>>, TError, {
        id: number;
        data: BodyType<CertificationToggle>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof patchOperatorCertification>>, TError, {
    id: number;
    data: BodyType<CertificationToggle>;
}, TContext>;
export type PatchOperatorCertificationMutationResult = NonNullable<Awaited<ReturnType<typeof patchOperatorCertification>>>;
export type PatchOperatorCertificationMutationBody = BodyType<CertificationToggle>;
export type PatchOperatorCertificationMutationError = ErrorType<void>;
/**
* @summary Toggle a single certification's verified status (admin only)
*/
export declare const usePatchOperatorCertification: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof patchOperatorCertification>>, TError, {
        id: number;
        data: BodyType<CertificationToggle>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof patchOperatorCertification>>, TError, {
    id: number;
    data: BodyType<CertificationToggle>;
}, TContext>;
export declare const getAcceptBidUrl: (id: number) => string;
/**
 * Marks a bid as accepted, closes the request, and creates a Stripe fee checkout session.
 * @summary Accept a bid (buyer only)
 */
export declare const acceptBid: (id: number, options?: RequestInit) => Promise<AcceptBidResponse>;
export declare const getAcceptBidMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof acceptBid>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof acceptBid>>, TError, {
    id: number;
}, TContext>;
export type AcceptBidMutationResult = NonNullable<Awaited<ReturnType<typeof acceptBid>>>;
export type AcceptBidMutationError = ErrorType<void>;
/**
* @summary Accept a bid (buyer only)
*/
export declare const useAcceptBid: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof acceptBid>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof acceptBid>>, TError, {
    id: number;
}, TContext>;
export declare const getGetDashboardSummaryUrl: () => string;
/**
 * @summary Get dashboard summary stats
 */
export declare const getDashboardSummary: (options?: RequestInit) => Promise<DashboardSummary>;
export declare const getGetDashboardSummaryQueryKey: () => readonly ["/api/dashboard/summary"];
export declare const getGetDashboardSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>>;
export type GetDashboardSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get dashboard summary stats
 */
export declare function useGetDashboardSummary<TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetRecentActivityUrl: () => string;
/**
 * @summary Get recent platform activity
 */
export declare const getRecentActivity: (options?: RequestInit) => Promise<ActivityItem[]>;
export declare const getGetRecentActivityQueryKey: () => readonly ["/api/dashboard/recent-activity"];
export declare const getGetRecentActivityQueryOptions: <TData = Awaited<ReturnType<typeof getRecentActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentActivity>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRecentActivity>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRecentActivityQueryResult = NonNullable<Awaited<ReturnType<typeof getRecentActivity>>>;
export type GetRecentActivityQueryError = ErrorType<unknown>;
/**
 * @summary Get recent platform activity
 */
export declare function useGetRecentActivity<TData = Awaited<ReturnType<typeof getRecentActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentActivity>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getRequestUploadUrlUrl: () => string;
/**
 * Returns a presigned GCS URL for direct upload. The client sends JSON
metadata here, then uploads the file directly to the returned URL.

 * @summary Request a presigned URL for file upload
 */
export declare const requestUploadUrl: (uploadUrlRequest: UploadUrlRequest, options?: RequestInit) => Promise<UploadUrlResponse>;
export declare const getRequestUploadUrlMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
        data: BodyType<UploadUrlRequest>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
    data: BodyType<UploadUrlRequest>;
}, TContext>;
export type RequestUploadUrlMutationResult = NonNullable<Awaited<ReturnType<typeof requestUploadUrl>>>;
export type RequestUploadUrlMutationBody = BodyType<UploadUrlRequest>;
export type RequestUploadUrlMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Request a presigned URL for file upload
*/
export declare const useRequestUploadUrl: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
        data: BodyType<UploadUrlRequest>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
    data: BodyType<UploadUrlRequest>;
}, TContext>;
export declare const getGetPublicObjectUrl: (filePath: string) => string;
/**
 * @summary Serve a public asset from PUBLIC_OBJECT_SEARCH_PATHS
 */
export declare const getPublicObject: (filePath: string, options?: RequestInit) => Promise<Blob>;
export declare const getGetPublicObjectQueryKey: (filePath: string) => readonly [`/api/storage/public-objects/${string}`];
export declare const getGetPublicObjectQueryOptions: <TData = Awaited<ReturnType<typeof getPublicObject>>, TError = ErrorType<ErrorEnvelope>>(filePath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPublicObject>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPublicObject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPublicObjectQueryResult = NonNullable<Awaited<ReturnType<typeof getPublicObject>>>;
export type GetPublicObjectQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary Serve a public asset from PUBLIC_OBJECT_SEARCH_PATHS
 */
export declare function useGetPublicObject<TData = Awaited<ReturnType<typeof getPublicObject>>, TError = ErrorType<ErrorEnvelope>>(filePath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPublicObject>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetStorageObjectUrl: (objectPath: string) => string;
/**
 * @summary Serve an object entity from PRIVATE_OBJECT_DIR
 */
export declare const getStorageObject: (objectPath: string, options?: RequestInit) => Promise<Blob>;
export declare const getGetStorageObjectQueryKey: (objectPath: string) => readonly [`/api/storage/objects/${string}`];
export declare const getGetStorageObjectQueryOptions: <TData = Awaited<ReturnType<typeof getStorageObject>>, TError = ErrorType<ErrorEnvelope>>(objectPath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStorageObject>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStorageObject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStorageObjectQueryResult = NonNullable<Awaited<ReturnType<typeof getStorageObject>>>;
export type GetStorageObjectQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary Serve an object entity from PRIVATE_OBJECT_DIR
 */
export declare function useGetStorageObject<TData = Awaited<ReturnType<typeof getStorageObject>>, TError = ErrorType<ErrorEnvelope>>(objectPath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStorageObject>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminListOperatorsUrl: () => string;
/**
 * @summary List all operators (admin)
 */
export declare const adminListOperators: (options?: RequestInit) => Promise<AdminOperator[]>;
export declare const getAdminListOperatorsQueryKey: () => readonly ["/api/admin/operators"];
export declare const getAdminListOperatorsQueryOptions: <TData = Awaited<ReturnType<typeof adminListOperators>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListOperators>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListOperators>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListOperatorsQueryResult = NonNullable<Awaited<ReturnType<typeof adminListOperators>>>;
export type AdminListOperatorsQueryError = ErrorType<unknown>;
/**
 * @summary List all operators (admin)
 */
export declare function useAdminListOperators<TData = Awaited<ReturnType<typeof adminListOperators>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListOperators>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminCreateOperatorUrl: () => string;
/**
 * @summary Create operator (admin)
 */
export declare const adminCreateOperator: (adminOperatorInput: AdminOperatorInput, options?: RequestInit) => Promise<AdminOperator>;
export declare const getAdminCreateOperatorMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateOperator>>, TError, {
        data: BodyType<AdminOperatorInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminCreateOperator>>, TError, {
    data: BodyType<AdminOperatorInput>;
}, TContext>;
export type AdminCreateOperatorMutationResult = NonNullable<Awaited<ReturnType<typeof adminCreateOperator>>>;
export type AdminCreateOperatorMutationBody = BodyType<AdminOperatorInput>;
export type AdminCreateOperatorMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Create operator (admin)
*/
export declare const useAdminCreateOperator: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateOperator>>, TError, {
        data: BodyType<AdminOperatorInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminCreateOperator>>, TError, {
    data: BodyType<AdminOperatorInput>;
}, TContext>;
export declare const getAdminUpdateOperatorUrl: (id: number) => string;
/**
 * @summary Update operator (admin)
 */
export declare const adminUpdateOperator: (id: number, adminOperatorInput: AdminOperatorInput, options?: RequestInit) => Promise<void>;
export declare const getAdminUpdateOperatorMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateOperator>>, TError, {
        id: number;
        data: BodyType<AdminOperatorInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateOperator>>, TError, {
    id: number;
    data: BodyType<AdminOperatorInput>;
}, TContext>;
export type AdminUpdateOperatorMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateOperator>>>;
export type AdminUpdateOperatorMutationBody = BodyType<AdminOperatorInput>;
export type AdminUpdateOperatorMutationError = ErrorType<void>;
/**
* @summary Update operator (admin)
*/
export declare const useAdminUpdateOperator: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateOperator>>, TError, {
        id: number;
        data: BodyType<AdminOperatorInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateOperator>>, TError, {
    id: number;
    data: BodyType<AdminOperatorInput>;
}, TContext>;
export declare const getAdminDeleteOperatorUrl: (id: number) => string;
/**
 * @summary Delete operator (admin)
 */
export declare const adminDeleteOperator: (id: number, options?: RequestInit) => Promise<void>;
export declare const getAdminDeleteOperatorMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteOperator>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminDeleteOperator>>, TError, {
    id: number;
}, TContext>;
export type AdminDeleteOperatorMutationResult = NonNullable<Awaited<ReturnType<typeof adminDeleteOperator>>>;
export type AdminDeleteOperatorMutationError = ErrorType<unknown>;
/**
* @summary Delete operator (admin)
*/
export declare const useAdminDeleteOperator: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteOperator>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminDeleteOperator>>, TError, {
    id: number;
}, TContext>;
export declare const getAdminListManufacturersUrl: () => string;
/**
 * @summary List manufacturers (admin)
 */
export declare const adminListManufacturers: (options?: RequestInit) => Promise<void>;
export declare const getAdminListManufacturersQueryKey: () => readonly ["/api/admin/manufacturers"];
export declare const getAdminListManufacturersQueryOptions: <TData = Awaited<ReturnType<typeof adminListManufacturers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListManufacturers>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListManufacturers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListManufacturersQueryResult = NonNullable<Awaited<ReturnType<typeof adminListManufacturers>>>;
export type AdminListManufacturersQueryError = ErrorType<unknown>;
/**
 * @summary List manufacturers (admin)
 */
export declare function useAdminListManufacturers<TData = Awaited<ReturnType<typeof adminListManufacturers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListManufacturers>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminCreateManufacturerUrl: () => string;
/**
 * @summary Create manufacturer (admin)
 */
export declare const adminCreateManufacturer: (adminManufacturerInput: AdminManufacturerInput, options?: RequestInit) => Promise<void>;
export declare const getAdminCreateManufacturerMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateManufacturer>>, TError, {
        data: BodyType<AdminManufacturerInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminCreateManufacturer>>, TError, {
    data: BodyType<AdminManufacturerInput>;
}, TContext>;
export type AdminCreateManufacturerMutationResult = NonNullable<Awaited<ReturnType<typeof adminCreateManufacturer>>>;
export type AdminCreateManufacturerMutationBody = BodyType<AdminManufacturerInput>;
export type AdminCreateManufacturerMutationError = ErrorType<void>;
/**
* @summary Create manufacturer (admin)
*/
export declare const useAdminCreateManufacturer: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateManufacturer>>, TError, {
        data: BodyType<AdminManufacturerInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminCreateManufacturer>>, TError, {
    data: BodyType<AdminManufacturerInput>;
}, TContext>;
export declare const getAdminUpdateManufacturerUrl: (id: number) => string;
/**
 * @summary Update manufacturer (admin)
 */
export declare const adminUpdateManufacturer: (id: number, adminManufacturerInput: AdminManufacturerInput, options?: RequestInit) => Promise<void>;
export declare const getAdminUpdateManufacturerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateManufacturer>>, TError, {
        id: number;
        data: BodyType<AdminManufacturerInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateManufacturer>>, TError, {
    id: number;
    data: BodyType<AdminManufacturerInput>;
}, TContext>;
export type AdminUpdateManufacturerMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateManufacturer>>>;
export type AdminUpdateManufacturerMutationBody = BodyType<AdminManufacturerInput>;
export type AdminUpdateManufacturerMutationError = ErrorType<unknown>;
/**
* @summary Update manufacturer (admin)
*/
export declare const useAdminUpdateManufacturer: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateManufacturer>>, TError, {
        id: number;
        data: BodyType<AdminManufacturerInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateManufacturer>>, TError, {
    id: number;
    data: BodyType<AdminManufacturerInput>;
}, TContext>;
export declare const getAdminDeleteManufacturerUrl: (id: number) => string;
/**
 * @summary Delete manufacturer (admin)
 */
export declare const adminDeleteManufacturer: (id: number, options?: RequestInit) => Promise<void>;
export declare const getAdminDeleteManufacturerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteManufacturer>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminDeleteManufacturer>>, TError, {
    id: number;
}, TContext>;
export type AdminDeleteManufacturerMutationResult = NonNullable<Awaited<ReturnType<typeof adminDeleteManufacturer>>>;
export type AdminDeleteManufacturerMutationError = ErrorType<unknown>;
/**
* @summary Delete manufacturer (admin)
*/
export declare const useAdminDeleteManufacturer: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteManufacturer>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminDeleteManufacturer>>, TError, {
    id: number;
}, TContext>;
export declare const getAdminListMapEntriesUrl: () => string;
/**
 * @summary List map entries (admin)
 */
export declare const adminListMapEntries: (options?: RequestInit) => Promise<void>;
export declare const getAdminListMapEntriesQueryKey: () => readonly ["/api/admin/map-entries"];
export declare const getAdminListMapEntriesQueryOptions: <TData = Awaited<ReturnType<typeof adminListMapEntries>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListMapEntries>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListMapEntries>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListMapEntriesQueryResult = NonNullable<Awaited<ReturnType<typeof adminListMapEntries>>>;
export type AdminListMapEntriesQueryError = ErrorType<unknown>;
/**
 * @summary List map entries (admin)
 */
export declare function useAdminListMapEntries<TData = Awaited<ReturnType<typeof adminListMapEntries>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListMapEntries>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminCreateMapEntryUrl: () => string;
/**
 * @summary Create map entry (admin) — creates a new operator with GPS data
 */
export declare const adminCreateMapEntry: (adminMapEntryInput: AdminMapEntryInput, options?: RequestInit) => Promise<void>;
export declare const getAdminCreateMapEntryMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateMapEntry>>, TError, {
        data: BodyType<AdminMapEntryInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminCreateMapEntry>>, TError, {
    data: BodyType<AdminMapEntryInput>;
}, TContext>;
export type AdminCreateMapEntryMutationResult = NonNullable<Awaited<ReturnType<typeof adminCreateMapEntry>>>;
export type AdminCreateMapEntryMutationBody = BodyType<AdminMapEntryInput>;
export type AdminCreateMapEntryMutationError = ErrorType<void>;
/**
* @summary Create map entry (admin) — creates a new operator with GPS data
*/
export declare const useAdminCreateMapEntry: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateMapEntry>>, TError, {
        data: BodyType<AdminMapEntryInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminCreateMapEntry>>, TError, {
    data: BodyType<AdminMapEntryInput>;
}, TContext>;
export declare const getAdminListMachineryUrl: () => string;
/**
 * @summary List machinery & parts listings (admin)
 */
export declare const adminListMachinery: (options?: RequestInit) => Promise<MachineryListing[]>;
export declare const getAdminListMachineryQueryKey: () => readonly ["/api/admin/machinery"];
export declare const getAdminListMachineryQueryOptions: <TData = Awaited<ReturnType<typeof adminListMachinery>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListMachinery>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListMachinery>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListMachineryQueryResult = NonNullable<Awaited<ReturnType<typeof adminListMachinery>>>;
export type AdminListMachineryQueryError = ErrorType<unknown>;
/**
 * @summary List machinery & parts listings (admin)
 */
export declare function useAdminListMachinery<TData = Awaited<ReturnType<typeof adminListMachinery>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListMachinery>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminCreateMachineryUrl: () => string;
/**
 * @summary Create machinery listing (admin)
 */
export declare const adminCreateMachinery: (machineryListingInput: MachineryListingInput, options?: RequestInit) => Promise<MachineryListing>;
export declare const getAdminCreateMachineryMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateMachinery>>, TError, {
        data: BodyType<MachineryListingInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminCreateMachinery>>, TError, {
    data: BodyType<MachineryListingInput>;
}, TContext>;
export type AdminCreateMachineryMutationResult = NonNullable<Awaited<ReturnType<typeof adminCreateMachinery>>>;
export type AdminCreateMachineryMutationBody = BodyType<MachineryListingInput>;
export type AdminCreateMachineryMutationError = ErrorType<void>;
/**
* @summary Create machinery listing (admin)
*/
export declare const useAdminCreateMachinery: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateMachinery>>, TError, {
        data: BodyType<MachineryListingInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminCreateMachinery>>, TError, {
    data: BodyType<MachineryListingInput>;
}, TContext>;
export declare const getAdminListListingsUrl: () => string;
/**
 * @summary List all capacity and product listings (admin)
 */
export declare const adminListListings: (options?: RequestInit) => Promise<AdminListingsResponse>;
export declare const getAdminListListingsQueryKey: () => readonly ["/api/admin/listings"];
export declare const getAdminListListingsQueryOptions: <TData = Awaited<ReturnType<typeof adminListListings>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListListings>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListListings>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListListingsQueryResult = NonNullable<Awaited<ReturnType<typeof adminListListings>>>;
export type AdminListListingsQueryError = ErrorType<unknown>;
/**
 * @summary List all capacity and product listings (admin)
 */
export declare function useAdminListListings<TData = Awaited<ReturnType<typeof adminListListings>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListListings>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminCreateListingUrl: () => string;
/**
 * @summary Create capacity or product listing (admin)
 */
export declare const adminCreateListing: (adminListingInput: AdminListingInput, options?: RequestInit) => Promise<void>;
export declare const getAdminCreateListingMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateListing>>, TError, {
        data: BodyType<AdminListingInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminCreateListing>>, TError, {
    data: BodyType<AdminListingInput>;
}, TContext>;
export type AdminCreateListingMutationResult = NonNullable<Awaited<ReturnType<typeof adminCreateListing>>>;
export type AdminCreateListingMutationBody = BodyType<AdminListingInput>;
export type AdminCreateListingMutationError = ErrorType<void>;
/**
* @summary Create capacity or product listing (admin)
*/
export declare const useAdminCreateListing: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateListing>>, TError, {
        data: BodyType<AdminListingInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminCreateListing>>, TError, {
    data: BodyType<AdminListingInput>;
}, TContext>;
export declare const getAdminUpdateListingUrl: (id: number) => string;
/**
 * @summary Update listing (admin) — send listing_type in body to select table
 */
export declare const adminUpdateListing: (id: number, adminListingInput: AdminListingInput, options?: RequestInit) => Promise<void>;
export declare const getAdminUpdateListingMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateListing>>, TError, {
        id: number;
        data: BodyType<AdminListingInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateListing>>, TError, {
    id: number;
    data: BodyType<AdminListingInput>;
}, TContext>;
export type AdminUpdateListingMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateListing>>>;
export type AdminUpdateListingMutationBody = BodyType<AdminListingInput>;
export type AdminUpdateListingMutationError = ErrorType<void>;
/**
* @summary Update listing (admin) — send listing_type in body to select table
*/
export declare const useAdminUpdateListing: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateListing>>, TError, {
        id: number;
        data: BodyType<AdminListingInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateListing>>, TError, {
    id: number;
    data: BodyType<AdminListingInput>;
}, TContext>;
export declare const getAdminDeleteListingUrl: (id: number, params?: AdminDeleteListingParams) => string;
/**
 * @summary Delete listing (admin) — send listing_type=capacity|product as query param
 */
export declare const adminDeleteListing: (id: number, params?: AdminDeleteListingParams, options?: RequestInit) => Promise<void>;
export declare const getAdminDeleteListingMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteListing>>, TError, {
        id: number;
        params?: AdminDeleteListingParams;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminDeleteListing>>, TError, {
    id: number;
    params?: AdminDeleteListingParams;
}, TContext>;
export type AdminDeleteListingMutationResult = NonNullable<Awaited<ReturnType<typeof adminDeleteListing>>>;
export type AdminDeleteListingMutationError = ErrorType<unknown>;
/**
* @summary Delete listing (admin) — send listing_type=capacity|product as query param
*/
export declare const useAdminDeleteListing: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteListing>>, TError, {
        id: number;
        params?: AdminDeleteListingParams;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminDeleteListing>>, TError, {
    id: number;
    params?: AdminDeleteListingParams;
}, TContext>;
export declare const getAdminGetMarketIntelligenceUrl: (params?: AdminGetMarketIntelligenceParams) => string;
/**
 * @summary Get live market intelligence metrics (admin)
 */
export declare const adminGetMarketIntelligence: (params?: AdminGetMarketIntelligenceParams, options?: RequestInit) => Promise<MarketIntelligenceData>;
export declare const getAdminGetMarketIntelligenceQueryKey: (params?: AdminGetMarketIntelligenceParams) => readonly ["/api/admin/market-intelligence", ...AdminGetMarketIntelligenceParams[]];
export declare const getAdminGetMarketIntelligenceQueryOptions: <TData = Awaited<ReturnType<typeof adminGetMarketIntelligence>>, TError = ErrorType<void>>(params?: AdminGetMarketIntelligenceParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetMarketIntelligence>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminGetMarketIntelligence>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminGetMarketIntelligenceQueryResult = NonNullable<Awaited<ReturnType<typeof adminGetMarketIntelligence>>>;
export type AdminGetMarketIntelligenceQueryError = ErrorType<void>;
/**
 * @summary Get live market intelligence metrics (admin)
 */
export declare function useAdminGetMarketIntelligence<TData = Awaited<ReturnType<typeof adminGetMarketIntelligence>>, TError = ErrorType<void>>(params?: AdminGetMarketIntelligenceParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetMarketIntelligence>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminPatchMarketIntelligenceOverrideUrl: () => string;
/**
 * @summary Override a market intelligence data point (admin)
 */
export declare const adminPatchMarketIntelligenceOverride: (marketIntelligenceOverrideInput: MarketIntelligenceOverrideInput, options?: RequestInit) => Promise<void>;
export declare const getAdminPatchMarketIntelligenceOverrideMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminPatchMarketIntelligenceOverride>>, TError, {
        data: BodyType<MarketIntelligenceOverrideInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminPatchMarketIntelligenceOverride>>, TError, {
    data: BodyType<MarketIntelligenceOverrideInput>;
}, TContext>;
export type AdminPatchMarketIntelligenceOverrideMutationResult = NonNullable<Awaited<ReturnType<typeof adminPatchMarketIntelligenceOverride>>>;
export type AdminPatchMarketIntelligenceOverrideMutationBody = BodyType<MarketIntelligenceOverrideInput>;
export type AdminPatchMarketIntelligenceOverrideMutationError = ErrorType<void>;
/**
* @summary Override a market intelligence data point (admin)
*/
export declare const useAdminPatchMarketIntelligenceOverride: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminPatchMarketIntelligenceOverride>>, TError, {
        data: BodyType<MarketIntelligenceOverrideInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminPatchMarketIntelligenceOverride>>, TError, {
    data: BodyType<MarketIntelligenceOverrideInput>;
}, TContext>;
export declare const getAdminListReportsUrl: () => string;
/**
 * @summary List stored report snapshots (admin)
 */
export declare const adminListReports: (options?: RequestInit) => Promise<ReportSnapshot[]>;
export declare const getAdminListReportsQueryKey: () => readonly ["/api/admin/reports"];
export declare const getAdminListReportsQueryOptions: <TData = Awaited<ReturnType<typeof adminListReports>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListReports>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListReports>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListReportsQueryResult = NonNullable<Awaited<ReturnType<typeof adminListReports>>>;
export type AdminListReportsQueryError = ErrorType<void>;
/**
 * @summary List stored report snapshots (admin)
 */
export declare function useAdminListReports<TData = Awaited<ReturnType<typeof adminListReports>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListReports>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminGenerateReportUrl: () => string;
/**
 * @summary Generate and store a report snapshot (admin)
 */
export declare const adminGenerateReport: (generateReportInput: GenerateReportInput, options?: RequestInit) => Promise<ReportSnapshot>;
export declare const getAdminGenerateReportMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminGenerateReport>>, TError, {
        data: BodyType<GenerateReportInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminGenerateReport>>, TError, {
    data: BodyType<GenerateReportInput>;
}, TContext>;
export type AdminGenerateReportMutationResult = NonNullable<Awaited<ReturnType<typeof adminGenerateReport>>>;
export type AdminGenerateReportMutationBody = BodyType<GenerateReportInput>;
export type AdminGenerateReportMutationError = ErrorType<void>;
/**
* @summary Generate and store a report snapshot (admin)
*/
export declare const useAdminGenerateReport: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminGenerateReport>>, TError, {
        data: BodyType<GenerateReportInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminGenerateReport>>, TError, {
    data: BodyType<GenerateReportInput>;
}, TContext>;
export declare const getAdminGetReportUrl: (id: number) => string;
/**
 * @summary Get a single report snapshot by ID (admin)
 */
export declare const adminGetReport: (id: number, options?: RequestInit) => Promise<ReportSnapshot>;
export declare const getAdminGetReportQueryKey: (id: number) => readonly [`/api/admin/reports/${number}`];
export declare const getAdminGetReportQueryOptions: <TData = Awaited<ReturnType<typeof adminGetReport>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetReport>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminGetReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminGetReportQueryResult = NonNullable<Awaited<ReturnType<typeof adminGetReport>>>;
export type AdminGetReportQueryError = ErrorType<void>;
/**
 * @summary Get a single report snapshot by ID (admin)
 */
export declare function useAdminGetReport<TData = Awaited<ReturnType<typeof adminGetReport>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetReport>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminDeleteReportUrl: (id: number) => string;
/**
 * @summary Delete a report snapshot (admin)
 */
export declare const adminDeleteReport: (id: number, options?: RequestInit) => Promise<void>;
export declare const getAdminDeleteReportMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteReport>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminDeleteReport>>, TError, {
    id: number;
}, TContext>;
export type AdminDeleteReportMutationResult = NonNullable<Awaited<ReturnType<typeof adminDeleteReport>>>;
export type AdminDeleteReportMutationError = ErrorType<void>;
/**
* @summary Delete a report snapshot (admin)
*/
export declare const useAdminDeleteReport: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteReport>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminDeleteReport>>, TError, {
    id: number;
}, TContext>;
export declare const getAdminListBlogPostsUrl: () => string;
/**
 * @summary List all blog posts (admin — drafts + published + archived)
 */
export declare const adminListBlogPosts: (options?: RequestInit) => Promise<AdminBlogPost[]>;
export declare const getAdminListBlogPostsQueryKey: () => readonly ["/api/admin/blog"];
export declare const getAdminListBlogPostsQueryOptions: <TData = Awaited<ReturnType<typeof adminListBlogPosts>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListBlogPosts>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListBlogPosts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListBlogPostsQueryResult = NonNullable<Awaited<ReturnType<typeof adminListBlogPosts>>>;
export type AdminListBlogPostsQueryError = ErrorType<void>;
/**
 * @summary List all blog posts (admin — drafts + published + archived)
 */
export declare function useAdminListBlogPosts<TData = Awaited<ReturnType<typeof adminListBlogPosts>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListBlogPosts>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminCreateBlogPostUrl: () => string;
/**
 * @summary Create a blog post (admin)
 */
export declare const adminCreateBlogPost: (adminBlogPostInput: AdminBlogPostInput, options?: RequestInit) => Promise<AdminBlogPost>;
export declare const getAdminCreateBlogPostMutationOptions: <TError = ErrorType<ErrorEnvelope | void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateBlogPost>>, TError, {
        data: BodyType<AdminBlogPostInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminCreateBlogPost>>, TError, {
    data: BodyType<AdminBlogPostInput>;
}, TContext>;
export type AdminCreateBlogPostMutationResult = NonNullable<Awaited<ReturnType<typeof adminCreateBlogPost>>>;
export type AdminCreateBlogPostMutationBody = BodyType<AdminBlogPostInput>;
export type AdminCreateBlogPostMutationError = ErrorType<ErrorEnvelope | void>;
/**
* @summary Create a blog post (admin)
*/
export declare const useAdminCreateBlogPost: <TError = ErrorType<ErrorEnvelope | void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateBlogPost>>, TError, {
        data: BodyType<AdminBlogPostInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminCreateBlogPost>>, TError, {
    data: BodyType<AdminBlogPostInput>;
}, TContext>;
export declare const getAdminGetBlogPostUrl: (id: number) => string;
/**
 * @summary Get a single blog post by ID (admin)
 */
export declare const adminGetBlogPost: (id: number, options?: RequestInit) => Promise<AdminBlogPost>;
export declare const getAdminGetBlogPostQueryKey: (id: number) => readonly [`/api/admin/blog/${number}`];
export declare const getAdminGetBlogPostQueryOptions: <TData = Awaited<ReturnType<typeof adminGetBlogPost>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetBlogPost>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminGetBlogPost>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminGetBlogPostQueryResult = NonNullable<Awaited<ReturnType<typeof adminGetBlogPost>>>;
export type AdminGetBlogPostQueryError = ErrorType<void>;
/**
 * @summary Get a single blog post by ID (admin)
 */
export declare function useAdminGetBlogPost<TData = Awaited<ReturnType<typeof adminGetBlogPost>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetBlogPost>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminUpdateBlogPostUrl: (id: number) => string;
/**
 * @summary Update a blog post (admin)
 */
export declare const adminUpdateBlogPost: (id: number, adminBlogPostInput: AdminBlogPostInput, options?: RequestInit) => Promise<AdminBlogPost>;
export declare const getAdminUpdateBlogPostMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateBlogPost>>, TError, {
        id: number;
        data: BodyType<AdminBlogPostInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateBlogPost>>, TError, {
    id: number;
    data: BodyType<AdminBlogPostInput>;
}, TContext>;
export type AdminUpdateBlogPostMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateBlogPost>>>;
export type AdminUpdateBlogPostMutationBody = BodyType<AdminBlogPostInput>;
export type AdminUpdateBlogPostMutationError = ErrorType<void>;
/**
* @summary Update a blog post (admin)
*/
export declare const useAdminUpdateBlogPost: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateBlogPost>>, TError, {
        id: number;
        data: BodyType<AdminBlogPostInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateBlogPost>>, TError, {
    id: number;
    data: BodyType<AdminBlogPostInput>;
}, TContext>;
export declare const getAdminDeleteBlogPostUrl: (id: number) => string;
/**
 * @summary Delete a blog post (admin)
 */
export declare const adminDeleteBlogPost: (id: number, options?: RequestInit) => Promise<void>;
export declare const getAdminDeleteBlogPostMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteBlogPost>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminDeleteBlogPost>>, TError, {
    id: number;
}, TContext>;
export type AdminDeleteBlogPostMutationResult = NonNullable<Awaited<ReturnType<typeof adminDeleteBlogPost>>>;
export type AdminDeleteBlogPostMutationError = ErrorType<void>;
/**
* @summary Delete a blog post (admin)
*/
export declare const useAdminDeleteBlogPost: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteBlogPost>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminDeleteBlogPost>>, TError, {
    id: number;
}, TContext>;
export declare const getAdminUploadBlogImageUrl: () => string;
/**
 * @summary Upload a blog post cover image (admin only). Send raw image bytes with correct Content-Type header.
 */
export declare const adminUploadBlogImage: (adminUploadBlogImageBody: Blob, options?: RequestInit) => Promise<AdminUploadBlogImage200>;
export declare const getAdminUploadBlogImageMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUploadBlogImage>>, TError, {
        data: BodyType<Blob>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUploadBlogImage>>, TError, {
    data: BodyType<Blob>;
}, TContext>;
export type AdminUploadBlogImageMutationResult = NonNullable<Awaited<ReturnType<typeof adminUploadBlogImage>>>;
export type AdminUploadBlogImageMutationBody = BodyType<Blob>;
export type AdminUploadBlogImageMutationError = ErrorType<void>;
/**
* @summary Upload a blog post cover image (admin only). Send raw image bytes with correct Content-Type header.
*/
export declare const useAdminUploadBlogImage: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUploadBlogImage>>, TError, {
        data: BodyType<Blob>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUploadBlogImage>>, TError, {
    data: BodyType<Blob>;
}, TContext>;
export declare const getUploadBlogCoverImageUrl: () => string;
/**
 * @summary Upload a blog cover image (admin only). Send raw image bytes with correct Content-Type header.
 */
export declare const uploadBlogCoverImage: (uploadBlogCoverImageBody: Blob, options?: RequestInit) => Promise<UploadBlogCoverImage200>;
export declare const getUploadBlogCoverImageMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof uploadBlogCoverImage>>, TError, {
        data: BodyType<Blob>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof uploadBlogCoverImage>>, TError, {
    data: BodyType<Blob>;
}, TContext>;
export type UploadBlogCoverImageMutationResult = NonNullable<Awaited<ReturnType<typeof uploadBlogCoverImage>>>;
export type UploadBlogCoverImageMutationBody = BodyType<Blob>;
export type UploadBlogCoverImageMutationError = ErrorType<void>;
/**
* @summary Upload a blog cover image (admin only). Send raw image bytes with correct Content-Type header.
*/
export declare const useUploadBlogCoverImage: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof uploadBlogCoverImage>>, TError, {
        data: BodyType<Blob>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof uploadBlogCoverImage>>, TError, {
    data: BodyType<Blob>;
}, TContext>;
export declare const getAdminUpdateMachineryUrl: (id: number) => string;
/**
 * @summary Update machinery listing (admin)
 */
export declare const adminUpdateMachinery: (id: number, machineryListingInput: MachineryListingInput, options?: RequestInit) => Promise<void>;
export declare const getAdminUpdateMachineryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateMachinery>>, TError, {
        id: number;
        data: BodyType<MachineryListingInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateMachinery>>, TError, {
    id: number;
    data: BodyType<MachineryListingInput>;
}, TContext>;
export type AdminUpdateMachineryMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateMachinery>>>;
export type AdminUpdateMachineryMutationBody = BodyType<MachineryListingInput>;
export type AdminUpdateMachineryMutationError = ErrorType<unknown>;
/**
* @summary Update machinery listing (admin)
*/
export declare const useAdminUpdateMachinery: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateMachinery>>, TError, {
        id: number;
        data: BodyType<MachineryListingInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateMachinery>>, TError, {
    id: number;
    data: BodyType<MachineryListingInput>;
}, TContext>;
export declare const getAdminDeleteMachineryUrl: (id: number) => string;
/**
 * @summary Delete machinery listing (admin)
 */
export declare const adminDeleteMachinery: (id: number, options?: RequestInit) => Promise<void>;
export declare const getAdminDeleteMachineryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteMachinery>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminDeleteMachinery>>, TError, {
    id: number;
}, TContext>;
export type AdminDeleteMachineryMutationResult = NonNullable<Awaited<ReturnType<typeof adminDeleteMachinery>>>;
export type AdminDeleteMachineryMutationError = ErrorType<unknown>;
/**
* @summary Delete machinery listing (admin)
*/
export declare const useAdminDeleteMachinery: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteMachinery>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminDeleteMachinery>>, TError, {
    id: number;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map