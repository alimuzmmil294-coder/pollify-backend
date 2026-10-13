export const generateOtp = () => Math.floor(100000 + Math.random() * 900000);

export const otpExpire = () => new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

export const otpValid = (user, inputOtp) => {
  // if ( !user.otpExpire || !inputOtp) return false;

  // console.log(user.otpExpire,inputOtp );

  if (!user?.otp || !user?.otpExpire || !inputOtp) return false;
  const isOtpMatch = String(user.otp) === String(inputOtp).trim();
  // console.log(isOtpMatch);

  const isNotExpired = new Date(user.otpExpire) > new Date();
  // console.log(isNotExpired);

  return isOtpMatch && isNotExpired;
};
