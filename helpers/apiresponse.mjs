// response.helper.js

// Define success response
export const successResponse = (res, msg) => {
    const data = {
        status: 1,
        message: msg
    };
    return res.status(200).json(data);
};

// Define success response with data
export const successResponseWithData = (res, msg, data) => {
    const resData = {
        status: 1,
        message: msg,
        data: data
    };
    return res.status(200).json(resData);
};

// Define error response
export const ErrorResponse = (res, msg) => {
    const data = {
        status: 0,
        message: msg,
    };
    return res.status(500).json(data);
};

// Define not found response
export const notFoundResponse = (res, msg) => {
    const data = {
        status: 0,
        message: msg,
    };
    return res.status(404).json(data);
};

// Define validation error response with data
export const validationErrorWithData = (res, msg, data) => {
    const resData = {
        status: 0,
        message: msg,
        data: data
    };
    return res.status(400).json(resData);
};

// Define unauthorized response
export const unauthorizedResponse = (res, msg) => {
    const data = {
        status: 0,
        message: msg,
    };
    return res.status(401).json(data);
};
