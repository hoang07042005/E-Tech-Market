<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string $password
 * @property string|null $phone
 * @property string|null $address_line
 * @property string|null $province
 * @property string|null $district
 * @property string|null $ward
 * @property string|null $avatar_url
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 */
class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;
    use SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'address_line',
        'province',
        'district',
        'ward',
        'avatar_url',
        'is_active',
        'email_verified_at',
        'remember_token',
        'current_points',
        'total_spent',
        'rank_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function carts(): HasOne
    {
        return $this->hasOne(Cart::class, 'user_id', 'id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'user_id', 'id');
    }

    public function savedCoupons(): BelongsToMany
    {
        return $this->belongsToMany(Coupon::class, 'user_coupons', 'user_id', 'coupon_id')->withTimestamps();
    }

    public function membershipRank()
    {
        return $this->belongsTo(MembershipRank::class, 'rank_id');
    }

    public function pointHistory()
    {
        return $this->hasMany(PointHistory::class, 'user_id');
    }
}
