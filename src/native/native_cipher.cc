// native_cipher.cc - C++ AVX2 SIMD Stream Cipher Native Addon for Node.js / Electron
#include <napi.h>
#include <immintrin.h> // AVX2
#include <cstdint>
#include <cstring>

void ApplyStreamCipherSIMD(char* data, size_t length, size_t startOffset) {
    const char key[20] = {'A','d','a','u','m','c','S','e','c','r','e','t','K','e','y','2','0','2','6','!'};
    
    // Construct 32-byte repeating key aligned for AVX2 registers
    alignas(32) uint8_t keyBuffer[32];
    for (size_t i = 0; i < 32; ++i) {
        keyBuffer[i] = static_cast<uint8_t>(key[(startOffset + i) % 20]);
    }
    
    __m256i keyVec = _mm256_load_si256((__m256i*)keyBuffer);
    size_t i = 0;
    
    // Process 32 bytes per instruction iteration
    for (; i + 32 <= length; i += 32) {
        __m256i chunk = _mm256_loadu_si256((__m256i*)(data + i));
        __m256i encrypted = _mm256_xor_si256(chunk, keyVec);
        _mm256_storeu_si256((__m256i*)(data + i), encrypted);
    }

    // Process remainder bytes
    for (; i < length; ++i) {
        data[i] ^= key[(startOffset + i) % 20];
    }
}

Napi::Value ApplyStreamCipherSIMDWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Expected (Buffer, length, startOffset)").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<char> buffer = info[0].As<Napi::Buffer<char>>();
    size_t length = info[1].As<Napi::Number>().Uint32Value();
    size_t startOffset = info[2].As<Napi::Number>().Uint32Value();

    if (length > buffer.Length()) {
        length = buffer.Length();
    }

    ApplyStreamCipherSIMD(buffer.Data(), length, startOffset);
    return env.Null();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(
        Napi::String::New(env, "applyStreamCipherSIMD"),
        Napi::Function::New(env, ApplyStreamCipherSIMDWrapped)
    );
    return exports;
}

NODE_API_MODULE(native_cipher, Init)
